# Importing the necessary libraries
import json
import os.path
import time
from datetime import datetime

from selenium.webdriver import ActionChains
from tqdm import tqdm
from selenium.webdriver.common.by import By
import undetected_chromedriver as uc
from sqlmodel import SQLModel, create_engine, Field, Session
from typing import List, Optional, Set, Dict


driver = uc.Chrome()

# Navigating to the Tesco groceries website
driver.get("https://groceries.asda.com/")
time.sleep(2)
driver.find_element(By.ID, "onetrust-accept-btn-handler").click()


def look_for_children(depth, current_position: List[int]):
    if len(current_position) > 0:
        pop = current_position.pop()
    else:
        pop = 0
    for j, menu_item in enumerate(driver.find_elements(By.CLASS_NAME, "h-nav__list")[depth].find_elements(By.CLASS_NAME,
                                                                                                          "h-nav__item-button")[
                                  pop:]):
        if menu_item.text == "Asda Rewards":
            continue
        if "has-children" in menu_item.get_attribute("class"):
            ActionChains(driver).move_to_element(menu_item).perform()
            m, c = look_for_children(depth + 1, current_position)
            if m:
                c.append(j + pop)
                return m, c
            else:
                continue
        else:
            return menu_item, [pop + j + 1]
    return None, []


menu_location = []
if os.path.exists("menu_location.json"):
    with open('menu_location.json', 'r') as file:
        json.loads(file.read())

products = []
while False:
    driver.find_element(By.CLASS_NAME, "navigation-menu__text").click()
    a, menu_location = look_for_children(0, menu_location)
    if a:
        a.click()
        time.sleep(2)
        with open('products.txt', 'a') as file:
            file.write("\n".join(
                {a.get_attribute("href") for a in driver.find_elements(By.CLASS_NAME, "co-product__anchor")}) + "\n")
    else:
        break
    with open('menu_location.json', 'w') as file:
        file.write(json.dumps(menu_location))

if os.path.exists("saved_products.txt"):
    saved_products = set(open("saved_products.txt", "r").readlines())
else:
    saved_products = {}

with Session(engine) as session:
    index = 0
    for p in set(open("products.txt", "r").readlines()):
        try:
            if p in saved_products:
                continue
            driver.get(p)
            time.sleep(1)
            session.add(Product(sku=p.split("/")[-1],
                                name=driver.find_element(By.CLASS_NAME, "pdp-main-details__title").text,
                                price=float(driver.find_element(By.CLASS_NAME, "pdp-main-details__price-container").text.split(
                                    "now\n£")[1]),
                                source_link=p,
                                measurement_and_quantity_information="",
                                category=driver.find_elements(By.CLASS_NAME, "breadcrumb__link")[-1].text.replace(
                                    "breadcrumb\n", ""),
                                supplier_document_filename="Asda"))
            session.commit()
            index += 1
            with open("saved_products.txt", "a") as saved_products_file:
                saved_products_file.write(p + "\n")
        except Exception as e:
            print(p)
            print(e)

    session.commit()
