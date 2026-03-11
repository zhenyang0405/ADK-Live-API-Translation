FROM python:3.12-slim
WORKDIR /app
COPY shared/ /app/shared/
COPY streaming/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY streaming/app/ /app/app/
ENV PYTHONPATH="/app:${PYTHONPATH}"
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
