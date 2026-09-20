FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY index.html game.js style.css server.py excel_db.py ./
COPY assets ./assets
EXPOSE 8080
ENV PORT=8080
CMD ["python", "server.py"]
