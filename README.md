Blockchain Collateral Implemenation
### Usage


### Installation

A) NODE & NPM                 

A.1) Download Node.js and NPM from https://nodejs.org/en/

A.2) To check if you have Node.js installed, run this command in your terminal:
```
node -v
```

A.3)To confirm that you have npm installed you can run this command in your terminal:
```
npm -v
```

A.4 Go into your code folder and run:
```
npm install
```
This will install all the dependencies in your application 






B) MONGODB

B.1) Download and Install mongodb from https://docs.mongodb.com/manual/installation/

B.2) Run mongodb server connection:
  - Make folder to store mongodb data eg. /user/mydbfolder
  - Run mongodob by specifying path:
```
mongod --dbpath C:/user/mydbfolder
```

B.3) Run mongo shell:
  - Open another command prompt/terminal
  - Start mongo:
```
mongo        
```




C) CHAIN-CORE

C.1) Install ChainCore from https://chain.com/technology/

C.2) To Start a new Blockchain:
-Run the chaincore app 
-Click on "Create new new Blockchain network" 
-Share the Blockchain ID  with peer: 
```
Navigate to Settings on top right
Click on Core Status 
Copy Blockchain ID and share with peer
```
-share the Client Token with peer:
```
Navigate to Settings on top right
Click on Acces Control 
Cick on New Token
Select Cross-Core token
Name the token
Copy the token and share with peer
```

-share the Generator URL, which will be as follows:
```
http://localhost:1999


*Replace localhost with your IP address
*The IP address Class A should be 192 or 172
*All parties should be on the same network
```

C.3) To join an existing Blockchain:
-Run the chaincore app 
-click on "Join an existing Blockchain Network" 
-Enter the Generator URL
-Enter the Blockchain ID
-Enter the Token

NOTE: If you run into trouble with, you can contact the support staff at chain.slack.com

D) RUN 

D.1 In another terminal, navigate to the code folder 

D.2 Run the following code, which opens a connection on port 3000:
```
npm start
```

D.3 In a browser, surf to:
```
http://localhost:3000
```


NOTE: To look at screenshots, view blockchainscreenshots.pdf in this folder  

