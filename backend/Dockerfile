FROM python:3.10-bookworm

WORKDIR /app

# Install nmap
RUN apt-get update \
    && apt-get install -y nmap \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
