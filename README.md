# Gemini Ai code execution and function calling app

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)]()
[![Maintaner](https://img.shields.io/static/v1?label=Oleksandr%20Samoilenko&message=Maintainer&color=red)](mailto:oleksandr.samoilenko@extrawest.com)
[![Ask Me Anything !](https://img.shields.io/badge/Ask%20me-anything-1abc9c.svg)]()
![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)
![GitHub release](https://img.shields.io/badge/release-v1.0.0-blue)

## PROJECT INFO

-   **Node.js app designed to showcase Gemini code generation and function calling approaches**

-   **The app includes two parts:**
  
    **1. code execution which allows the AI to run computer code directly within its system to solve tasks, analyze data, or produce outputs programmatically.**
    
    **2. Function calling - allows the AI to interact with external functions or APIs (predefined blocks of code) to fetch information, perform actions, or connect with other systems. It has integration with third party ai services for searching hotels attractions ad flight tickets**

##Preview

**1. Code execution demo**
https://github.com/user-attachments/assets/2964cce6-fea6-41e8-bc95-77f5559f95d0



## Features

-   Google generative ai gemini-1.5-flash
-   Gemini function calling
-   Gemini code execution
-   FlightApi.io - https://www.flightapi.io/
-   Mackorps.com - https://docs.makcorps.com/hotel-apis
-   Geoapify.com - https://www.geoapify.com/

## Preview

## Installing:

**1. Clone this repo to your folder:**

```
git clone https://gitlab.extrawest.com/gemini-api-functions-calling
```

**2. Change current directory to the cloned folder:**

```
cd gemini-api-functions-calling
```

## Setup Project

**1. First you need to sign up on several services to get access to api: https://www.flightapi.io/, https://docs.makcorps.com/hotel-apis, https://www.geoapify.com/**
**2. In the root of the directory create .env file and add the following variables:**

```
API_KEY = "YOUR_GEMINI_API_KEY"
GEOAPIFY_API_KEY = 'YOUR_GEOAPIFY_API_KEY'
FLIGHT_API_KEY = "YOUR_FLIGHT_API_KEY"
HOTEL_API_KEY = "YOUR_HOTEL_API_KEY"
```

**4. Run code execution:**
To start code execution, just run `npm code_execution.js`.

**5. Run code execution:**
To start functions calling, just run `npm functions_calling.js`.

Now you can use the app

Created by Oleksandr Samoilenko

[Extrawest.com](https://www.extrawest.com), 2025
