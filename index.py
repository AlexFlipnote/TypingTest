import json
import os
import asyncio

from quart import Quart, render_template, send_from_directory, abort

with open("config.json", "r") as f:
    config = json.load(f)

app = Quart(__name__)
app.config.update(
    DEBUG=config["debug"],
    PROPAGATE_EXCEPTIONS=False
)


# Fetch all languages to cache
all_languages = {}
words_language = {}
for file in os.listdir("languages"):
    if file.endswith(".json"):
        with open(f"languages/{file}", encoding="utf-8") as f:
            lang_temp = json.load(f)
            lang_name = file[:-5]
            all_languages[lang_name] = {
                "seconds": lang_temp["_SECONDS"], "errors": lang_temp["_ERRORS"],
                "reset": lang_temp["_RESET"], "typing_test": lang_temp["_TYPING_TEST"],
                "select_languages": lang_temp["_SELECT_LANGUAGES"],
                "author": lang_temp["_author"], "emoji": lang_temp["emoji"],
                "description": lang_temp["_DESCRIPTION"], "start_text": lang_temp["_START_TEXT"],
                "language": lang_temp["language"], "language_url": lang_name,
                "finish_word": lang_temp["_FINISH_WORD"]
            }

            words_language[lang_name] = lang_temp["words"]


def validate_language(lang_name: str):
    """ Validate if language is inside the language folder """
    if lang_name not in [g for g in all_languages]:
        abort(404, "Language not found...")


@app.route("/")
async def index_home():
    return await render_template(
        "index.html", words=words_language["en-us"], language=all_languages["en-us"]
    )


@app.route("/languages")
async def index_select_language():
    return await render_template(
        "languages.html", languages=[all_languages[g] for g in all_languages]
    )


@app.route("/languages/<language>")
async def index_home_lang(language: str):
    validate_language(language)
    return await render_template(
        "index.html", words=words_language[language], language=all_languages[language]
    )


@app.route("/assets/<path:path>")
async def send_assets(path):
    return await send_from_directory("templates/assets", path)


loop = asyncio.get_event_loop()
app.run(port=config["port"], loop=loop)
