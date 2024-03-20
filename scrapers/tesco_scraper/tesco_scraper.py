# Importing the necessary libraries
import json
import os.path

from tqdm import tqdm
from selenium.webdriver.common.by import By
import undetected_chromedriver as uc
from sqlmodel import SQLModel, create_engine, Field, Relationship, Session
from typing import List, Optional, Set, Dict
#
# driver = uc.Chrome()
#
# # Navigating to the Tesco groceries website
# driver.get("https://www.tesco.com/groceries/")
#
# # Scraping ALL departments URLs from the Tesco website
# departments = [
#     "https://www.tesco.com/groceries/en-GB/shop/" + a.replace(" ", "-").replace("&", "and").lower() + "/all"
#     for a in driver.find_element(By.CLASS_NAME, "menu-superdepartment").text.split("\n")
#     if a != "Shop" and a != "department"
# ]
# # Filtering out irrelevant URLs - IDEALLY WE WANT CATCH ALL FOR THIS
# departments = [a for a in departments if "inspiration-and-events" not in a]
#
# # opens visited pages to check what's been completed and starts from that point
#
# if os.path.exists("visited_pages.txt"):
#     with open("visited_pages.txt","r") as visited_pages:
#        pages_and_departments = visited_pages.read().splitlines()
# else:
#     pages_and_departments = []
#
# page_and_department_split = "    "
# # Iterating over each department to scrape product URLs
# for department in departments:
#     has_next = True
#     index = 1
#     while has_next:
#         # Navigating to the department page, handling pagination ("index 1" doesn't have 1, but all the rest do)
#         if index != 1:
#             driver.get(department + "?page=" + str(index))
#         else:
#             driver.get(department)
#
#         if str(index) + page_and_department_split + department not in pages_and_departments:
#             # Extracting product URLs from the current page
#             products_from_this_page = {
#                 a.get_attribute("href") for a in driver.find_elements(By.XPATH, "//*/a")
#                 if a.get_attribute("href") is not None and a.get_attribute("href").startswith("https://www.tesco.com/groceries/en-GB/products/")
#             }
#
#             # Determining if there is a next page based on the number of products found
#             has_next = len(products_from_this_page) > 15
#             with open('tesco_products.txt', 'a') as file: # 'a' means append
#                 file.write("\n".join(products_from_this_page)+"\n")
#             with open('visited_pages.txt', 'a') as file: # 'a' means append - DEL VISITED PAGES BEFORE ANOTHER RUN
#                 file.write(str(index) + page_and_department_split + department + "\n")
#         index += 1
#
# products = set(open("tesco_products.txt", "r").read().splitlines())
# products.remove("")
# if os.path.exists("scraped_tesco_products.txt"):
#     with open('scraped_tesco_products.txt', 'r') as file:
#         products.difference_update(["https://www.tesco.com/groceries/en-GB/products/" +
#                                 json.loads(jline)["sku"] for jline in file.read().splitlines()])
#
#
#
# for index, product in tqdm(enumerate(products)):
#     try:
#         driver.get(product)
#         clubcard_price = [a for a in driver.find_elements(By.TAG_NAME, "span") if
#                           "StyledOfferText" in a.get_attribute("class")]
#         if len(clubcard_price) > 0 and clubcard_price[0].text.startswith("£"):
#             price = clubcard_price[0].text.split(" ")[0]
#             price_per_weight = ""
#         else:
#             container = "ddsweb-price__container"
#             price = driver.find_element(By.CLASS_NAME, container).find_elements(By.CSS_SELECTOR, "*")[0].text
#             price_per_weight = driver.find_element(By.CLASS_NAME, container).find_elements(By.CSS_SELECTOR, "*")[1].text
#
#         name = driver.find_element(By.TAG_NAME,"h1").text
#         breadcrumb__list = "ddsweb-breadcrumb__list"
#         category = ", ".join([a.text for a in driver.find_element(By.CLASS_NAME,
#                                                                   breadcrumb__list).find_elements(By.TAG_NAME, "span")[0:-1]])
#         with open('scraped_tesco_products.jsonl', 'a') as file:
#             file.write(json.dumps({"sku":product.split("/")[-1],"name":name,"price":float(price.replace("£","")),
#                         "measurement_and_quantity_information":price_per_weight,"category":category,
#                         "supplier_document_filename":"Tesco"}) + "\n")
#     except Exception as e:
#         print(e)
#         print("can't " + product, e)

from azure.cosmos import CosmosClient, PartitionKey
import json

# Azure Cosmos DB configuration
ENDPOINT = "https://basket-db.documents.azure.com:443/"
KEY = "Z92Xd8xFioylKiZhhR1daxMIbtqHYUgqKZKJSMXS9i9DdLOBuyhsDxUy7Rybc3VqY1DtdVSKhJTsACDbpAz2fQ=="
DATABASE_NAME = "mbdb"
CONTAINER_NAME = "products"

# Initialize a Cosmos client
client = CosmosClient(ENDPOINT, KEY)

# Get a reference to the database
database = client.get_database_client(DATABASE_NAME)

# Get a reference to the container
container = database.get_container_client(CONTAINER_NAME)
from tqdm import tqdm

# Assuming your JSONL file structure matches the Cosmos DB documents
with open('scraped_tesco_products.jsonl', 'r') as file:
    product: Dict
    for index, product in tqdm(enumerate(json.loads(line) for line in file)):
        # Insert the document into Cosmos DB
        product["id"] = "Asda" + product["sku"]
        product["supplier_document_filename"] = "Asda"
        product["price"] = product["price"] - 0.20
        container.upsert_item(product)
