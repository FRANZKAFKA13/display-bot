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
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        

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
            const userID = step.options;

            // Read UserData from DB
            const user = await this.memoryStorage.read([userID]);
            
            //user = user[userID];
            console.log("Gelesene UserDaten im DisplayBot");
            console.log(user);

            // await step.context.sendActivity(`Hallo ${user[this.userID].name}, du bist ${user[this.userID].name} Jahre alt, ${user[this.userID].age}, hast ${user[this.userID].education} und studierst ${user[this.userID].major}.`);
            try {
                await step.context.sendActivity(`${user[userID].payout}` );
            }
            catch (e) { 
                console.log("Error beim Lesen der Daten im Display Bot");
                console.log(e);
                await step.context.sendActivity("Leider habe ich von dir keine Daten vorliegen.")
                }
            
    }

    /**
     *
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext) {
        const dc = await this.dialogSet.createContext(turnContext);

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
                        
                        const conversationData = await this.conversationDataAccessor.get(turnContext, {});
                        
                        
                        console.log("User added DisplayBot. URL ID:");
                        conversationData.URLparam = turnContext.activity.membersAdded[idx].id;
                        console.log(conversationData.URLparam);
                                                
                        await dc.beginDialog('displayPayout', conversationData.URLparam);
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

