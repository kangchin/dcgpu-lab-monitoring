# backend/Dockerfile - UPDATED VERSION
# Use bookworm Python 3.10 base image
FROM python:3.10-bookworm

# Set working directory
WORKDIR /app

# Force HTTPS for apt sources (bookworm uses DEB822 .sources format)
RUN find /etc/apt -name "*.list" -exec sed -i 's|http://|https://|g' {} + ; \
    find /etc/apt -name "*.sources" -exec sed -i 's|http://|https://|g' {} + ; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    nmap \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

EXPOSE 5000

# Copy project files
COPY . .

# Run the Flask app
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]