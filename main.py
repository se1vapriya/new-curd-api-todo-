import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import engine, get_db, SessionLocal

load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Seed the fixed login account (selva / selvasathya) if it doesn't exist yet
with SessionLocal() as db:
    auth.seed_default_user(db)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    same_site="lax",
)

app.mount("/app", StaticFiles(directory="static", html=True), name="static")


@app.get("/")
def intro_page():
    return FileResponse("static/intro.html")


@app.get("/login")
def login_page():
    return FileResponse("static/login.html")


@app.get("/api/status")
def status():
    return {"message": "FastAPI Todo API is Running"}


# Log in
@app.post("/auth/login")
def login(credentials: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    if not auth.authenticate(db, credentials.username, credentials.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    request.session["user"] = credentials.username
    return {"message": "Logged in", "username": credentials.username}


# Log out
@app.post("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}


# Current session
@app.get("/auth/me")
def me(username: str = Depends(auth.get_current_user)):
    return {"username": username}


# Create Todo
@app.post("/todos", response_model=schemas.TodoResponse)
def create_todo(
    todo: schemas.TodoCreate,
    db: Session = Depends(get_db),
    _: str = Depends(auth.get_current_user),
):
    db_todo = models.Todo(
        title=todo.title,
        description=todo.description,
        completed=todo.completed
    )

    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)

    return db_todo


# Get All Todos
@app.get("/todos", response_model=List[schemas.TodoResponse])
def get_todos(db: Session = Depends(get_db), _: str = Depends(auth.get_current_user)):
    todos = db.query(models.Todo).all()
    return todos


# Get Todo by ID
@app.get("/todos/{todo_id}", response_model=schemas.TodoResponse)
def get_todo(todo_id: int, db: Session = Depends(get_db), _: str = Depends(auth.get_current_user)):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    return todo


# Update Todo
@app.put("/todos/{todo_id}", response_model=schemas.TodoResponse)
def update_todo(
    todo_id: int,
    updated_todo: schemas.TodoCreate,
    db: Session = Depends(get_db),
    _: str = Depends(auth.get_current_user),
):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    todo.title = updated_todo.title
    todo.description = updated_todo.description
    todo.completed = updated_todo.completed

    db.commit()
    db.refresh(todo)

    return todo


# Delete Todo
@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db), _: str = Depends(auth.get_current_user)):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(todo)
    db.commit()

    return {"message": "Todo deleted successfully"}