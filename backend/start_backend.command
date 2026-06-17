#!/bin/bash
cd ~/Desktop/"AI AGENT PRO2"/"founder orchestration"/backend

echo "Installing dependencies..."
pip3 install --break-system-packages fastapi==0.111.0 uvicorn==0.29.0 python-dotenv==1.0.1 langgraph==0.2.28 langchain==0.3.14 langchain-openai==0.2.14 langchain-community==0.3.14 langsmith==0.2.10 tavily-python==0.5.0 PyGithub==2.3.0 notion-client==2.2.1 pinecone==5.3.1 asyncpg==0.31.0 psycopg2-binary==2.9.12 pdfplumber==0.11.0 reportlab==4.2.0 python-multipart==0.0.9 sse-starlette==2.1.0 httpx==0.27.0

echo "Installing tiktoken (may take a moment)..."
pip3 install --break-system-packages tiktoken || echo "Warning: tiktoken failed to install, continuing anyway..."

echo ""
echo "Killing anything on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo "Starting backend on port 8000..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 2>&1 | tee /tmp/backend.log
