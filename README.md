# WeMeep Notification Service
---
### Description
This service is responsible for sending notifications to the different client devices, triggered by the very same devices. It uses Google Cloud Messaging framework, through XMPP (CCS) protocol, over a NodeJS-ExpressJS implementation, all contained on a Docker aplication.

Also, thanks to docker-compose, monitoring is available through NewRelic.
### Setup
##### Docker
Simply:
```
docker-compose up -d
```
##### Enviroment variables
Set:
````
- GCM_API_KEY
````
