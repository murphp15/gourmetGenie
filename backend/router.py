
from typing import List
from zoneinfo import ZoneInfo

import openai
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from fastapi import APIRouter

from datetime import datetime

from sqlmodel import SQLModel, create_engine, Field
from sqlalchemy import Column, JSON
from typing import Optional, Dict

router = APIRouter(
    tags=["product"],
    responses={404: {"description": "Not found"}},
)

class ChromeQuestion(BaseModel):
    basket: List[dict]
    messages: List[dict]
    logged_out: bool
    unique_id: str


engine = create_engine("postgresql://root:postgres@localhost:5432/postgres", echo=True)

class ChromeConversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    userid: str
    created_at: datetime
    conversation: Dict = Field(default={}, sa_column=Column(JSON))

SQLModel.metadata.create_all(engine)

@router.post("/chrome_question")
async def handle_question(chrome_question:ChromeQuestion):
    with Session(engine) as session:
        results = session.exec(select(func.count()).where(ChromeConversation.userid == chrome_question.unique_id))
        count = results.one()
        if count>100:
            raise Exception("over allocation")
        session.add(ChromeConversation(userid=chrome_question.unique_id,
                                       created_at=datetime.now(tz=ZoneInfo('Europe/London')),
                                       conversation=chrome_question.json()))
        session.commit()

    systemMessage = ('You are a chatbot on the tesco website. You appear in the bottom right corner. '
                     "When you do a search on the customers behalf please don't list the results as they can actually see them on screen. "
                     "You should quide ppl on what to eat. your initial greeting should be short. "
                     "Often ppl will ask for the ingredients of a dish. When they do that can you please start your response message with <option>Would you like me to order this for you?</option>. I am going to render this on the fe as a button."
                     "However please don't include <option>Would you like me to order this for you?</option> if they are looking at mutiple versions of the same product (e.g they are looking at bananas. Or they are looking at cream). Because they would never reasonably want to order all of them."
                     " Instead of returning markdown for can you use HTML tags as this can be rendered on the frontend.  Instead of returning backslash n for newlines please return <br>"
                     " within their cart at the moment they have " + str(chrome_question.basket) + ". Please don't infer from the conversation what else they might have have in their cart. As they might add/remove stuff without letting you know.")


    functions = [
        {
            "name": "search_for_product",
            "description": "call to search the tesco website. Returns a json with the search results",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_term": {
                        "type": "string",
                        "description": "the term to search the tesco website using",
                    },
                },
                "required": ["search_term"],
            },
        },
        {
            "name": "search_competitors",
            "description": "call to search for products in competitors websites. Returns a json with the search results",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_term": {
                        "type": "string",
                        "description": "the term to search the tesco website using",
                    },
                    "competitors_name": {
                        "type": "string",
                        "description": "the name of the competitor. for example ASDA, ",
                    },

                },
                "required": ["search_term"],
            },
        },
    ]

    if not chrome_question.logged_out:
        functions.append({
            "name": "add_product_to_cart",
            "description": "add products to your current cart so that you can checkout later. This will be added to the quantity they currently have. To remove products pass in a negative number as the quantity. " +
                           "To remove products from their cart you would pass in a negative number equal to the amount of products in their cart",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The partial url of the product. It should start with /groceries",
                    },
                    "quantity": {
                        "type": "number",
                        "description": "The quantity of the product",
                    },
                },
                "required": ["url", "quantity"],
            },
        })

    return openai.ChatCompletion.create(
        messages=[{"role": "system", "content": systemMessage}] + chrome_question.messages,
        api_base="https://mybasket-azure-openai.openai.azure.com/",
        functions=functions,
        api_type='azure',
        engine="gpt-4",
        temperature=0.0,
        api_version="2023-07-01-preview").choices[0].message

