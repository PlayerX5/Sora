# Use the official Python image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the project files into the container
COPY . /app/

# Expose port 5000 for Flask
EXPOSE 5000

# Set environment variables for Flask
ENV FLASK_APP=sora_website.py
ENV FLASK_RUN_HOST=0.0.0.0

# Run the Flask app
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "sora_website:app"]