'use strict'; 
const PAGE_ACCESS_TOKEN = process.env.page_access_token;

const 
    { getUserById, createNewUserWithId, updateUserWithMaze, deleteUserById = require('./stateDB.js'),
    { handleMessage, handlePostback, sendInitialGreetings } = require('./botResponse.js'),
    { generateMaze } = require('./mazeAlgorithms.js'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json())

app.listen(process.env.PORT || 3000, () => console.log(`webhook is listening on port:${process.env.PORT || "3000"}`))

app.post('/webhook', (req, res) => {
    let body = req.body
    if (body.object === 'page') {
        let userID, userMessage, userPostback;
        body.entry.forEach((entry) => {
            let webhook_event = entry.messaging[0]
            console.log(webhook_event)
            userID = webhook_event.sender.id
            userMessage = webhook_event.message
            userPostback = webhook_event.postback

        })

        getUserById(userID)
            .then(response => {
                let userInfo = response.Item
                if (userInfo && userPostback) {
                    // if user exists check the postback
                    // postback is from creating a maze only
                    // create a maze based on postback payload
                    // update the db, send maze for solution
                    console.log(userInfo, userPostback.payload)
                    const difficulty = {
                        easy: [7,7],
                        medium: [9,9],
                        hard: [11,11],
                        hardLong: [13, 9]
                    }
                    
                    const row = difficulty[userPostback.payload][0]
                    const col = difficulty[userPostback.payload][1]
                    const [maze, startAndEnd] = generateMaze(row, col)
                    userInfo.maze = maze
                    userInfo.start = startAndEnd[0]
                    userInfo.end = startAndEnd[1]
                    updateUserWithMaze(userID, maze, startAndEnd[0], startAndEnd[1])
                    handlePostback(userID, userPostback, userInfo)

                } else if (userInfo && userMessage) {
                    // if user exists check the message
                    // check message if solution and solution is correct =>
                    // check if message is "quit", "new maze", "solution" 
                    // if none of those, ask if you want to restart again. => send the postback message start again
                    if (userMessage.text === "quit") {
                        deleteUserById(userID)
                    }

                } else {
                    // if user does not exist
                    // create the user and present the postback welcome message
                    createNewUserWithId(userID, [], [], [])
                    sendInitialGreetings(userID)
                }
            })
            .catch(error => {
                console.log(error)
            })

        res.status(200).send('EVENT_RECEIVED')
    } else {
        res.sendStatus(404)
    }
})

app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.verification_token

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});
