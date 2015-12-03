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
### Methods
- Send notification to device: Sends a notification to a specific device
```javascript
function sendNotificationToDevice(id, to, message)
```
- Send notification to topic: Sends a notification to a group of devices
```javascript
function sendNotificationToTopic(id, topic, message)
```
### WebService
The web service exposes two methods:
- If a notification to a device must be sent
```
http://host:8080/notifdevice
```
- If a notification to a group must be sent
```
http://host:8080/notiftopic
```
Both receive a `POST`request, with required parameters (`id, to, topic, message`) on a `JSON`on the body, for example:
```
curl -H "Content-Type: application/json" -X POST -d '{"id":1, "message":{"data":"some data", "public":"false"}, "to":"d2u3boTSskQ:AP...dzfv"}' http://host:8080/notifdevice
```

### Notification Message Specification
The notification message has to follow the following specification
```
{ field1: value1, field2:value2, ...}
```
| Name          | Values        | Description                          |
| ------------- |---------------| -------------------------------------|
| silent        | true/false    | If the notification must be promoted |
| intent        | Some activity |   The activity wich must open        |
| type          | To be defined |    type of notification              |
| big-title     | String        | Big notification title               |
|small-title    | String        | Small notification text              |
