// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// bot.js is your bot's main entry point to handle incoming activities.

const { ActivityTypes, ActionTypes } = require('botbuilder');
const { NumberPrompt, ChoicePrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const { MessageFactory } = require('botbuilder');
const { ShowTypingMiddleware } = require('botbuilder');
const path = require('path');
const fs = require('fs');



// The accessor names for the conversation data and user profile state property accessors.
const CONVERSATION_DATA_PROPERTY = 'conversationData';
const USER_DATA_PROPERTY = 'userData';
const RISK_DATA_PROPERTY = 'userRiskData';
const INVESTMENT_DATA_PROPERTY = 'userInvestmentData';


class MyBot {
    /**
     *
     * @param {ConversationState} conversation A ConversationState object used to store values specific to the conversation.
     * @param {userState} userState A UserState object used to store values specific to the user.
     */
    constructor(conversationState, userState, dialogSet, memoryStorage) {
        // Creates a new state accessor property.
        // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors
        this.conversationState = conversationState;
        this.userState = userState;

        // Memory storage
        this.memoryStorage = memoryStorage;

        // Conversation Data Property for ConversationState
        this.conversationData = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        // Properties for UserState
        //this.userData = userState.createProperty(USER_DATA_PROPERTY);
        this.riskData = userState.createProperty(RISK_DATA_PROPERTY);
        this.investmentData = userState.createProperty(INVESTMENT_DATA_PROPERTY);


        // Add prompts that will be used in dialogs
        this.dialogSet = dialogSet;
        this.dialogSet.add(new TextPrompt('textPrompt'));
        this.dialogSet.add(new ChoicePrompt('choicePrompt'));
        this.dialogSet.add(new NumberPrompt('numberPrompt'));


        // Welcome dialog
        this.dialogSet.add(new WaterfallDialog('displayPayout', [
            this.displayPayout.bind(this),
        ]));
    }

    async displayPayout (step) {
            console.log("Display Payout");

            // Get userID
            var userID = step.options;

            // Read UserData from DB
            var user = await this.memoryStorage.read([userID]);
            user = user[userID];

            // await step.context.sendActivity(`Hallo ${user[this.userID].name}, du bist ${user[this.userID].name} Jahre alt, ${user[this.userID].age}, hast ${user[this.userID].education} und studierst ${user[this.userID].major}.`);
            try {
                await step.context.sendActivity(`${user.payout}` );
            }
            catch (e) { await step.context.sendActivity("Leider habe ich von dir keine Daten vorliegen.")}
            
    }

    /**
     *
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext) {
        let dc = await this.dialogSet.createContext(turnContext);

        //await logMessageText(this.memoryStorage, turnContext, this.userState);

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.value){
        }
        if (turnContext.activity.type === ActivityTypes.Message) {

            //await dc.continueDialog();
    

        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            // Do we have any new members added to the conversation?
            if (turnContext.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (var idx in turnContext.activity.membersAdded) {
                    // Greet anyone that was not the target (recipient) of this message.
                    // Since the bot is the recipient for events from the channel,
                    // context.activity.membersAdded === context.activity.recipient.Id indicates the
                    // bot was added to the conversation, and the opposite indicates this is a user.
                    if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                        console.log("User added");
                        var userID = turnContext.activity.membersAdded[idx].id;
                        
                        
                        await dc.beginDialog('displayPayout', userID);
                    }
                }
            }
        }
    
        // Save changes to the user state.
        await this.userState.saveChanges(turnContext);

        // End this turn by saving changes to the conversation state.
        await this.conversationState.saveChanges(turnContext);
    }
}
exports.MyBot = MyBot;

