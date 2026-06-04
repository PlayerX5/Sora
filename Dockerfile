# Use the official Python image
# FROM python:3.9-slim
FROM python:3.9-slim as builder

# Set the working directory
WORKDIR /app

# Install dependencies
# COPY requirements.txt /app/
# RUN pip install --no-cache-dir -r requirements.txt
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM python:3.9-slim
# Copy the project files into the container
# COPY . /app/
COPY --from=builder /install /usr/local
COPY . /app
WORKDIR /app

# Expose port 5000 for Flask
# EXPOSE 5000

# Set environment variables for Flask
# ENV FLASK_APP=sora_website.py
# ENV FLASK_RUN_HOST=0.0.0.0

# Run the Flask app
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "sora_website:app"]