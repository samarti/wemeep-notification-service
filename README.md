# WeMeep Notification Service
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
- MEEP_SERVICE_URL
- SESSION_SERVICE_URL
````
### WebService
The web service exposes one method:
- Send a notification
```
http://host:8080/notificate
```
It receives a `POST` request, with required parameters on a `JSON` on the body, for example:
```bash
curl -H "Content-Type: application/json" -X POST -d '{"id":1, "message":{"data":"some data", "public":"false"}, "to":"d2u3boTSskQ:AP...dzfv"}' http://host:8080/notifdevice
```

### Post JSON Specification
The notification message has to follow the following specification
```
{ field1: value1, field2:value2, ...}
```
| Name          | Values        | Description                          |
| ------------- |---------------| -------------------------------------|
| silent        | true/false    | If the notification must be promoted |
| type          | See below |    Notification type             |
| senderName     | String    | The sender username            |
| senderId       | String    | The sender id        |
| rootMeepId    | String    | Optional, must be specified if the type is newMessage |

#### Notification types
- newMessage: When a new message is sent and the user is subscribed to the conversation
- newMeep: When a user sends to another user a direct meep.
- newSecretMeep: When a user sends a secret meep.
