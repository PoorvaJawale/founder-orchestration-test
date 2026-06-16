import os
from github import Github
from notion_client import Client

def verify_github() -> dict:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        return {"valid": False, "error": "GITHUB_TOKEN environment variable is missing"}
    try:
        g = Github(token)
        user = g.get_user()
        login = user.login
        return {"valid": True, "username": login, "error": None}
    except Exception as e:
        return {"valid": False, "error": str(e)}

def verify_notion() -> dict:
    api_key = os.environ.get("NOTION_API_KEY")
    database_id = os.environ.get("NOTION_DATABASE_ID")
    if not api_key:
        return {"valid": False, "error": "NOTION_API_KEY environment variable is missing"}
    if not database_id:
        return {"valid": False, "error": "NOTION_DATABASE_ID environment variable is missing"}
    try:
        notion = Client(auth=api_key)
        notion.databases.retrieve(database_id=database_id)
        return {"valid": True, "error": None}
    except Exception as e:
        return {"valid": False, "error": str(e)}
