# Import libraries
import boto3
from IPython.display import display, Markdown

# Define bedrock runtime library
bedrock = boto3.client(service_name="bedrock-runtime")

# Define model ID
modelId = "us.amazon.nova-lite-v1:0"

# Define prompts
system_prompt = """
You are a helpful expert in artificial intelligence and machine learning.
"""
user_prompt = """
Explain convolutional neural networks to a high school student.
"""

# Define inference config
inference_config = {
    "temperature": 1.0,
    "topP": 1.0,
    "maxTokens": 2000,
}

# Build the message objects
messages = [{"role": "user", "content": [{"text": user_prompt}]}]
system = [{"text": system_prompt}]

# Call the Bedrock converse API
response = bedrock.converse(
    modelId=modelId,
    messages=messages,
    system=system,
    inferenceConfig=inference_config,
)

display(Markdown(response["output"]["message"]["content"][0]["text"]))