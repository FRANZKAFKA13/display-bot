// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// bot.js is your bot's main entry point to handle incoming activities.

const { ActivityTypes, ActionTypes } = require('botbuilder');
const { NumberPrompt, ChoicePrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const { MessageFactory } = require('botbuilder');
const path = require('path');
const fs = require('fs');


//import { DirectLine } from 'botframework-directlinejs';
const { DirectLine } = require('botframework-directlinejs');

var directLine = new DirectLine({
    secret: "gEhdp5OpmP0.cwA.BTU.KhaAI6r0Ay72nO5DEgsA5XYx2GLWafFMwmydG0nFvdA",
    //token: /* or put your Direct Line token here (supply secret OR token, not both) ,
    //domain: /* optional: if you are not using the default Direct Line endpoint, e.g. if you are using a region-specific endpoint, put its full URL here 
    //webSocket: /* optional: false if you want to use polling GET to receive messages. Defaults to true (use WebSocket). ,
    //pollingInterval: /* optional: set polling interval in milliseconds. Default to 1000,
}); 





// Import AdaptiveCard content
const riskCard = [];
for (var i = 1; i <= 10; ++i) {
    riskCard[i] = require('./resources/RiskCard' + i + '.json');
}
const factSheet = [];
for (var i = 0; i <= 2; ++i) {
    factSheet[i] = require('./resources/FactSheet' + i + '.json');
}



// Referencing the microsoft recognizer package (https://github.com/Microsoft/Recognizers-Text/tree/master/JavaScript/packages/recognizers-text-suite)
var Recognizers = require('@microsoft/recognizers-text-suite');
var NumberRecognizers = require('@microsoft/recognizers-text-number');
var NumberWithUnitRecognizers = require('@microsoft/recognizers-text-number-with-unit');
var DateTimeRecognizers = require('@microsoft/recognizers-text-date-time');
var SequenceRecognizers = require('@microsoft/recognizers-text-sequence');
var ChoiceRecognizers = require('@microsoft/recognizers-text-choice'); 


// User Profile Data Object
const userData = {
    userName: { 
        tag: "Name",
        prompt: "Wie heißt du?",
        value: ""
    },
    age: {
        tag: "Alter",
        prompt: "Wie alt bist du? **(Bitte Alter als Zahl eingeben)**",
        value: "",
        recognize: (step) => {
            var input = step.result.toString();
            var result = Recognizers.recognizeNumber(input, Recognizers.Culture.German);
            result = parseInt(result[0].resolution.value);
            return result;
        },
        validate: async (step) => {
            try {
                // Recognize the input as a number. This works for responses such as
                // "twelve" as well as "12".
                var input = step.result.toString();
                var result = Recognizers.recognizeNumber(input, Recognizers.Culture.German);
                var age = parseInt(result[0].resolution.value);
                console.log("Alter " + age);
                if (age < 16) {
                    await step.context.sendActivity("Für die Teilnahme am Experiment musst du **16 Jahre oder älter** sein.");
                    return false;
                }
                if (age > 80 ) {
                    await step.context.sendActivity("Für die Teilnahme am Experiment musst du **80 Jahre oder jünger** sein.");
                    return false;
                }
            } catch (e) {
                await step.context.sendActivity("Ich habe dein Alter leider nicht verstanden.");
                console.log("Fehlermeldung :" + e);
                return false;
            }
            return true;
        }
    },
    gender: {
        tag: "Geschlecht",
        prompt: "Was ist dein Geschlecht?",
        value: ""
    },
    education: {
        tag: "Höchster Bildungsabschluss",
        prompt: "Was ist dein höchster Bildungsabschluss?",
        value: ""
    },
    major: {
        tag: "Studiengang",
        prompt: "Was studierst du? **(Bitte Zahl oder Titel eingeben)**",
        prompt_other: "Dein Studiengang war wohl **nicht in der Liste**. Wie heißt dein Studiengang?",
        value: ""
    },
/*     experience_finance: {
        tag: "Erfahrung mit Finanzprodukten",
        prompt: "Wie viel **Erfahrung** hast du mit **Finanzprodukten**?",
        value: ""
    },
    experience_roboadvisor: {
        tag: "Erfahrung mit Robo-Advisory",
        prompt: 'Wie viel **Erfahrung** hast du mit **Robo-Advisory**?',
        value: ""
    }, */
}


// Array of education
const educations = ['Sekundarstufe', 'Bachelor', 'Master', 'Promotion', 'Sonstiges'];

// Array of majors
const majors = ['WING / INWI / TVWL', 'Maschinenbau', 'Informatik', 'Mathematik', 'Ich studiere nicht'];

// Additional properties relevant for user data (seperate in order to better iterate through user data)
const userDataProperties = {
    complete: {value: false},
    display: {value: ""},
}

// Data for Risk Assessment
const riskAssessmentData = {
    roundCounter: "",
    repeat: false,
    choices: [],
    choiceOutput: "",
    riskValue: "",
    riskDescription: "",
    complete: {value: false},
}

// Data for Investment decision
const investmentData = {
    companies: ["ACG GmbH", "Breen GmbH", "Plus GmbH"],
    order: [],
    choice: undefined,
    follow: undefined,

    repeat: false,

    // Determines which company follows which stock price chart
    win1: undefined, // Factor: 1.214
    win2: undefined, // Factor: 1.143
    loss1: undefined, // Factor: 0.857
    loss2: undefined, // Factor: 0.785

    payout: undefined
}




// Turn counter property
const TURN_COUNTER_PROPERTY = 'turnCounterProperty';

class MyBot {
    /**
     *
     * @param {ConversationState} conversation state object
     */
    constructor(conversationState, userState, dialogSet) {
        // Creates a new state accessor property.
        // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors
        this.conversationState = conversationState;
        this.countProperty = conversationState.createProperty(TURN_COUNTER_PROPERTY);

        this.dialogSet = dialogSet;
        this.dialogSet.add(new TextPrompt('textPrompt'));
        this.dialogSet.add(new ChoicePrompt('choicePrompt'));
        this.dialogSet.add(new NumberPrompt('numberPrompt'));

        this.userState = userState;
        this.userDataAccessor = this.userState.createProperty('userData');
        


        

        // Welcome dialog
        this.dialogSet.add(new WaterfallDialog('welcome', [
            async function (step) {
                // Welcome the user
                await step.context.sendActivity("Hallo, ich bin ein **Robo-Advisor**. Ich begleite dich durch den Beratungsprozess.");
                return await step.beginDialog('mainMenu');
            }]));

        // Main Menu Dialog
        this.dialogSet.add(new WaterfallDialog('mainMenu', [
            async function (step) {
               // Return await step.prompt('choicePrompt', "Wähle eine der folgenden Optionen aus", ['Order Dinner', 'Reserve a table', 'Profil erstellen']);
               return await step.prompt('choicePrompt', "**Bitte wähle** eine der folgenden Optionen aus", ['Profil erstellen', 'Profil anzeigen', 'Profil löschen', 'Risikoverhalten', 'Investment']);
            },
            async function (step) {
                // Handle the user's response to the previous prompt and branch the dialog.
                if (step.result.value.match(/Profil erstellen/ig)) {
                    return await step.beginDialog('createProfile');
                }
                if (step.result.value.match(/Profil anzeigen/ig)) {
                    return await step.beginDialog('displayProfile');
                }
                if (step.result.value.match(/Profil löschen/ig)) {
                    return await step.beginDialog('deleteProfile');
                }
                if (step.result.value.match(/Risikoverhalten/ig)) {
                    return await step.beginDialog('riskAssessment');
                }
                if (step.result.value.match(/Investment/ig)) {
                    return await step.beginDialog('investmentDecision');
                }
            },
            async function (step) {
                // Calling replaceDialog will loop the main menu
                return await step.replaceDialog('mainMenu');
            }
        ]));


    
        // Create UserProfile 
        this.dialogSet.add(new WaterfallDialog('createProfile', [
            async function (step) {
                console.log("Name Prompt");
                // Before prompting, check if value already exists
                if(!userData.userName.value){
                    await step.context.sendActivity("Ich stelle dir nun ein paar Fragen, um deine Daten zu erfassen.");
                    return await step.prompt('textPrompt', userData.userName.prompt);
                } else{
                    return await step.next();
                }
            },
            async function (step) {
                console.log("Age Prompt");
                // Before saving entry, check if it already exists
                if(!userData.userName.value){
                    userData.userName.value = step.result;
                    await step.context.sendActivity(`Hallo **${userData.userName.value}**!`)
                }
                // Before prompting, check if value already exists
                if(!userData.age.value){
                    return await step.prompt('textPrompt', userData.age.prompt);
                } else {
                    return await step.next();
                }
            },
            async function (step) {
                console.log("Gender Prompt");
                // Before saving entry, check if it already exists
                if(!userData.age.value){
                    let validated = await userData.age.validate(step)
                    if (validated){
                        userData.age.value = userData.age.recognize(step);
                        // Before prompting, check if value already exists
                        if(!userData.gender.value){
                            return await step.prompt('choicePrompt', userData.gender.prompt, ['Männlich', 'Weiblich', 'Sonstiges']);
                        } else {
                            return await step.next();
                        }
                    } else if (!validated) {
                        return await step.replaceDialog("createProfile");
                    }
                } else {
                        return await step.next();
                }
            },
            async function (step) {
                console.log("Education Prompt");
                // Before saving entry, check if it already exists
                if(!userData.gender.value){
                    userData.gender.value = step.result.value;
                }
                // Before prompting, check if value already exists
                if (!userData.education.value){
                    // Prompt for highest education with list of educations
                    return await step.prompt('choicePrompt', userData.education.prompt, educations);
                } else {
                    return await step.next();
                }
            },
            async function (step) {
                console.log("Major Prompt");
                // Before saving entry, check if it already exists
                if(!userData.education.value){
                    userData.education.value = step.result.value;
                }
                // Before prompting, check if value already exists
                if (!userData.major.value){
                    // Copy List of majors and add "Other" entry
                    let majorsOther = majors.slice(0,majors.length);
                    majorsOther.push("Einen anderen Studiengang");
                    return await step.prompt('choicePrompt', userData.major.prompt, majorsOther);
                } else {
                    return await step.next();
                }
            },
            async function (step) {
                console.log("Major Other");
                if (!userData.major.value){
                    // Check if entered major is part of majors array
                    if (majors.indexOf(step.result.value) == -1){
                        return await step.prompt('textPrompt', userData.major.prompt_other);
                    } else {
                        // If not, save response to profile
                        userData.major.value = step.result.value;
                        return await step.next();
                    }
                } else {
                    // If major is already in profile, skip this step
                    return await step.next();
                }
            },
/*             async function (step) {
                console.log("Experience Finance");
                // Before saving entry, check if it already exists
                if (!userData.major.value){
                    userData.major.value = step.result;
                }
                // Before prompting, check if value already exists
                if (!userData.experience_finance.value){
                    return await step.prompt('choicePrompt', userData.experience_finance.prompt, ['Keine', 'Etwas', 'Viel']);
                } else {
                    return await step.next();
                }
            },
            async function (step) {
                console.log("Experience Robo Advisor");
                // Before saving entry, check if it already exists
                if (!userData.experience_finance.value){
                    userData.experience_finance.value = step.result.value;
                }
                // Before prompting, check if value already exists
                if (!userData.experience_roboadvisor.value){
                    return await step.prompt('choicePrompt', userData.experience_roboadvisor.prompt, ['Keine', 'Etwas', 'Viel']);
                } else {
                    return await step.next();
                }
            }, */
            async function (step) {
                console.log("Complete");
                // Before saving entry, check if it already exists
                if (!userData.major.value){
                    userData.major.value = step.result;
                }
                if (userDataProperties.complete.value == false){
                    userDataProperties.complete.value = true;
                    await step.context.sendActivity(`Super, dein Profil ist nun vollständig.`);
                } else {
                    await step.context.sendActivity(`Du hast dein Profil bereits ausgefüllt.`);
                }
                return await step.replaceDialog("mainMenu");
            }
        ]));

        
        // Display UserProfile
        this.dialogSet.add(new WaterfallDialog('displayProfile', [
            async function (step) {
                // Iterate through user data and create string
                Object.keys(userData).forEach(function(key) {
                    userDataProperties.display.value = "" + userDataProperties.display.value  + "**" + userData[key].tag + "**" + ': ' + userData[key].value.toString() + '\n';
                })
                // Replace undefined with ""
                userDataProperties.display.value = userDataProperties.display.value.replace(/undefined/g, "");
                // Display profile to user
                await step.context.sendActivity(userDataProperties.display.value);
                // Clear display string
                userDataProperties.display.value = "";
                // End dialog
                return await step.replaceDialog('mainMenu');
            }
        ]));

        // Delete UserProfile
        this.dialogSet.add(new WaterfallDialog('deleteProfile', [
            async function (step) {
                // Iterate through user data and delete entries
                Object.keys(userData).forEach(function(key) {
                    userData[key].value = "";
                })
                // Clear "complete" Tag
                userDataProperties.complete = false;
                // End dialog
                await step.context.sendActivity("Dein Profil wurde gelöscht.");
                return await step.replaceDialog('mainMenu');
            }
        ]));

        // Assess risk
        this.dialogSet.add(new WaterfallDialog('riskAssessment', [
            async function (step) {

                // Überprüfen, ob Spiel bereits läuft, falls nicht, neue Runde starten 
                if (!riskAssessmentData.roundCounter) {
                    riskAssessmentData.roundCounter = 1;
                    await step.context.sendActivity("Um dein Risikoverhalten zu analysieren, werde ich ein kleines Spiel mit dir spielen.\
                    Ich präsentiere dir nun bis zu zehn mal hintereinander zwei Lotteriespiele, von denen du dich jeweils für eines entscheiden musst.");
                    await step.context.sendActivity("Jedes Spiel hat zwei mögliche Ausgänge, die jeweils eine festgelegte Wahrscheinlichkeit und \
                    eine festgelegte Auszahlung haben. Es gibt keinen Einsatz.");                   
                }

                // If RiskAssessment already finished, notify user and go back to main menu
                if (riskAssessmentData.complete == true) {
                    await step.context.sendActivity(`Dein Risikoverhalten wurde bereits ermittelt. Du bist **${riskAssessmentData.riskDescription}**.`);
                    // Go Back to main menu
                    await step.replaceDialog('mainMenu');
                    // Only present card, if round is not a repeated round
                } else if (riskAssessmentData.repeat == true){
                    riskAssessmentData.repeat = false;
                    await step.context.sendActivity("");
                } else {
                    // Present Adaptive Card 1-10 for gathering User Input
                    await step.context.sendActivity({
                        text: `Runde  ${riskAssessmentData.roundCounter}`,
                        attachments: [CardFactory.adaptiveCard(riskCard[riskAssessmentData.roundCounter])]
                    });
                }
                
            },
            async function (step) {
                // If user types in message, restart without iterating round counter
                if (step.result) {
                    await step.context.sendActivity("Bitte **triff deine Auswahl** und klicke auf **OK**.");
                    // Set repeat flag 
                    riskAssessmentData.repeat = true;
                    // Dialog abbrechen und Schritt wiederholen
                    return await step.replaceDialog('riskAssessment');
                }

                // Retrieve choice object from Adaptive JSON Card
                var choice = step.context.activity.value;
                
                // Key extrahieren, Nummer abschneiden und in Zahl umwandeln (Welche Karte wurde benutzt?)
                var roundPlayed = Object.keys(choice)[0];
                roundPlayed = parseInt(roundPlayed.substr(6,roundPlayed.length));

                // Überprüfen, ob Nutzer eine bereits verwendete Karte benutzt
                if (roundPlayed < riskAssessmentData.roundCounter) {
                    await step.context.sendActivity(`Für Runde ${roundPlayed} hast du bereits eine Wahl getroffen, bitte neuste Runde spielen.`);
                    // Set repeat flag 
                    riskAssessmentData.repeat = true;
                    // Dialog abbrechen und Schritt wiederholen
                    return await step.replaceDialog('riskAssessment');
                // Case-Switch nötig, da JSON Cards Output statisch zurückgeben und eine Unterscheidung zwischen den Returns der Karten nötig ist (choice1-10)
                } else {
                    switch (riskAssessmentData.roundCounter) {
                        case 1:
                            choice = choice.choice1;
                            break;
                        case 2:
                            choice = choice.choice2;
                            break;
                        case 3:
                            choice = choice.choice3;
                            break;
                        case 4:
                            choice = choice.choice4;
                            break;      
                        case 5:
                            choice = choice.choice5;
                            break; 
                        case 6:
                            choice = choice.choice6;
                            break; 
                        case 7:
                            choice = choice.choice7;
                            break; 
                        case 8:
                            choice = choice.choice8;
                            break; 
                        case 9:
                            choice = choice.choice9;
                            break; 
                        case 10:
                            choice = choice.choice10;
                            break; 
                    }
                    
                }
                // If user didn't make choice, reprompt
                if (choice.localeCompare("Bitte wählen") == 0) {
                    await step.context.sendActivity("Du hast keine eindeutige Wahl getroffen. Bitte erneut wählen.")
                    // Set repeat flag 
                    riskAssessmentData.repeat = true;
                    // Dialog abbrechen und Schritt wiederholen
                    return await step.replaceDialog('riskAssessment');
                }
                // Save choice
                riskAssessmentData.choices.push(choice);

                // Make choice transparent for user
                await step.context.sendActivity(`Du hast dich in Runde ${roundPlayed} für Spiel ${choice} entschieden.`)


                // Repeat until all games are played or until B is played
                if (riskAssessmentData.roundCounter < 10 && !choice.localeCompare("A")) {
                    riskAssessmentData.roundCounter++;
                    return await step.replaceDialog('riskAssessment');
                } else {
                    // Tag risk assessment as complete
                    riskAssessmentData.complete = true;
                    // Assess risk behavior based on Holt and Laury (2002)
                    // How many safe choices (A) were made by the user?
                    var safeChoices = roundPlayed - 1;
                    switch (safeChoices) {
                        case 0:
                            riskAssessmentData.riskDescription = "höchst risikoliebend";
                            break;
                        case 1:
                            riskAssessmentData.riskDescription = "höchst risikoliebend";
                            break;
                        case 2:
                            riskAssessmentData.riskDescription = "sehr risikoliebend";
                            break;
                        case 3:
                            riskAssessmentData.riskDescription = "risikoliebend";
                            break;
                        case 4:
                            riskAssessmentData.riskDescription = "risikoneutral";
                            break;      
                        case 5:
                            riskAssessmentData.riskDescription = "leicht risikoavers";
                            break; 
                        case 6:
                            riskAssessmentData.riskDescription = "risikoavers";
                            break; 
                        case 7:
                            riskAssessmentData.riskDescription = "sehr risikoavers";
                            break; 
                        case 8:
                            riskAssessmentData.riskDescription = "höchst risikoavers";
                            break; 
                        case 9:
                            riskAssessmentData.riskDescription = "bleib lieber im Bett";
                            break; 
                        case 10:
                            riskAssessmentData.riskDescription = "bleib besser im Bett";
                            break; 
                    }
                    // End dialog
                    await step.context.sendActivity(`Danke, dein Risikoverhalten wurde analysiert. Die verbale Bezeichnung deines Risikoverhaltens lautet: **${riskAssessmentData.riskDescription}**.`)
                    return await step.replaceDialog('mainMenu');
                }
            }
        ]));

        // Show Investment Options
        this.dialogSet.add(new WaterfallDialog('investmentDecision', [
            async function (step) {
                if (investmentData.repeat == false){
                    await step.context.sendActivity("Da nun alle von dir relevanten Daten erfasst sind und dein Risikoprofil ermittelt ist, können wir mit der Investitionsentscheidung beginnen. Du hast ein Budget von **7,00€** zur Verfügung.");
                }
                return await step.prompt('choicePrompt', "In welcher Branche möchtest du dein Investment tätigen?", ['Automobilindustrie', 'Halbleiterindustrie', 'Gesundheitsbranche', 'Andere Branche']); 
            },
            async function (step) {
                if (step.result.value.localeCompare("Halbleiterindustrie") != 0) {
                    await step.context.sendActivity("Entschuldigung, diese Funktion ist leider zum aktuellen Zeitpunkt noch nicht verfügbar. Bitte entscheide dich für eine andere Branche.");
                    investmentData.repeat = true;
                    return await step.replaceDialog('investmentDecision');
                }
                await step.context.sendActivity("Wir werden nun deinem Ziel nachkommen, dein Investitionsportfolio um eine Investition in der **Halbleiterindustrie** zu erweitern.");
                await step.context.sendActivity("Um dir Arbeit zu ersparen, habe ich die drei vielversprechendsten Unternehmen vorselektiert. Ich werde dir gleich die wichtigsten Informationen zu den drei Unternehmen zukommen lassen, um dir eine Entscheidungsgrundlage zu geben.");
                await step.context.sendActivity("Anschließend werde ich dir eine Empfehlung basierend auf deinem Risikoprofil und meiner Einschätzung der Unternehmen zukommen lassen.");
                return await step.prompt('choicePrompt', "Hast du alles verstanden?", ['Ja', 'Nein']);
            },
            async function (step) {
                // Create random order and save order to investmentData
                var arr = ["0", "1", "2"];
                for (var i = 1; i <= 3; i++){
                    investmentData.order.push(arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
                }

                // Present Adaptive cards in a carousel in random order
                let messageWithCarouselOfCards = MessageFactory.carousel([
                    CardFactory.adaptiveCard(factSheet[investmentData.order[0]]),
                    CardFactory.adaptiveCard(factSheet[investmentData.order[1]]),
                    CardFactory.adaptiveCard(factSheet[investmentData.order[2]]),
                ],"Hier die Unternehmensdaten. Bitte nimm dir genug Zeit, diese zu lesen.");

                await step.context.sendActivity(messageWithCarouselOfCards);
                await step.context.sendActivity("Können wir fortfahren?");
            },
            async function (step) {
                // Make randomized recommendation 
                await step.context.sendActivity(`Basierend auf meinen vergangenen Erfahrungen mit Investitionen und den Unternehmensdaten, halte ich \
                sowohl die **${investmentData.companies[investmentData.order[0]]}** als auch die **${investmentData.companies[investmentData.order[2]]}** für **überbewertet**. \
                Die **${investmentData.companies[investmentData.order[1]]}** halte ich dagegen für **unterbewertet**. \
                Das Ergebnis deiner **Risikoverhaltensanalyse** passt außerdem zum Unternehmensprofil der **${investmentData.companies[investmentData.order[1]]}**. Aufgrund dessen \
                empfehle ich dir, in **${investmentData.companies[investmentData.order[1]]}** zu investieren.`);
                return await step.next();
            },
            async function (step) {
                // Let user make decision with the help of a heroCard with buttons
                const reply = { type: ActivityTypes.Message };

                // Create dynamic buttons with the same order that was randomly generated before
                const buttons = [
                    { type: ActionTypes.ImBack, title: investmentData.companies[investmentData.order[0]], value: investmentData.companies[investmentData.order[0]] },
                    { type: ActionTypes.ImBack, title: investmentData.companies[investmentData.order[1]], value: investmentData.companies[investmentData.order[1]] },
                    { type: ActionTypes.ImBack, title: investmentData.companies[investmentData.order[2]], value: investmentData.companies[investmentData.order[2]] }
                ];

                // Add buttons and text to hero card
                const card = CardFactory.heroCard('', undefined,
                    buttons, { text: 'In **welches Unternehmen** möchtest du dein vorhandenes Investitionsbudget von **7,00€** investieren? Du wirst in einem Jahr an dem **Gewinn** oder **Verlust**  des Unternehmens beteiligt werden.' });
                
                // Add card to reply and send
                reply.attachments = [card];
                await step.context.sendActivity(reply);
            },
            async function (step) {
                // Save choice
                investmentData.choice = step.result;
                // Determine, if user followed advisor or not and reply accordingly
                if (investmentData.choice.localeCompare(investmentData.companies[investmentData.order[1]]) == 0) {
                    await step.context.sendActivity();
                    investmentData.follow = true;
                    return await step.prompt('choicePrompt', `Du hast dich dafür entschieden, in die **${investmentData.choice}** zu investieren! Danke für dein Vertrauen.`, ['Ein Jahr warten']);
                } else {
                    investmentData.follow = false;
                    return await step.prompt('choicePrompt', `Du hast dich dafür entschieden, in die **${investmentData.choice}** zu investieren!`, ['Ein Jahr warten']);
                }
            },
            async function (step) {
                // Randomly assign stock price charts to companies
                var arr = ["0", "1", "2", "3"];
                var allOutcomes = ["win1", "win2", "loss1", "loss2"];
                var outcomes = [];
                var arrHelp = [];
                // Fill arrHelp with three random entries from arr ([0,1,2,3])
                for (var i = 1; i <= 3; i++) {
                    arrHelp.push(arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
                }
                // Map random arrHelp to allOutcomes and save them in outcomes array (18 possibilities)
                for (var i = 0; i < 3; i++) {
                    outcomes.push(allOutcomes[arrHelp[i]]);
                }

                console.log(outcomes);

                // Transform outcomes to verbal statements and save result in investmentData
                var statements = [];
                for (var i = 0; i < 3; i++) {
                    if (outcomes[i].localeCompare("win1") == 0) {
                        statements[i] = `Der Wert der **${investmentData.companies[investmentData.order[i]]}** hat sich um 21,4% **erhöht**.`
                        investmentData.win1 = investmentData.companies[investmentData.order[i]];
                    } else if (outcomes[i].localeCompare("win2") == 0) {
                        statements[i] = `Der Wert der **${investmentData.companies[investmentData.order[i]]}** hat sich um 14,3% **erhöht**.`
                        investmentData.win2 = investmentData.companies[investmentData.order[i]];
                    } else if (outcomes[i].localeCompare("loss1") == 0) {
                        statements[i] = `Der Wert der **${investmentData.companies[investmentData.order[i]]}** hat sich um 14,3% **verringert**.`
                        investmentData.loss1 = investmentData.companies[investmentData.order[i]];
                    } else if (outcomes[i].localeCompare("loss2") == 0) {
                        statements[i] = `Der Wert der **${investmentData.companies[investmentData.order[i]]}** hat sich um 21,5% **verringert**.`
                        investmentData.loss2 = investmentData.companies[investmentData.order[i]];
                    }
                }


                // Inform user
                await step.context.sendActivity("Ein Jahr ist vergangen. Sehen wir uns an, wie sich die Aktienkurse der Unternehmen entwickelt haben.");

                

                // Present stock price charts in a carousel
                var chart1 = "" + investmentData.companies[investmentData.order[0]].toLowerCase().replace(/\s/g, '') + "_" + outcomes[0];
                var chart2 = "" + investmentData.companies[investmentData.order[1]].toLowerCase().replace(/\s/g, '') + "_" + outcomes[1];
                var chart3 = "" + investmentData.companies[investmentData.order[2]].toLowerCase().replace(/\s/g, '') + "_" + outcomes[2];

                let messageWithCarouselOfCharts = MessageFactory.carousel([
                    getStockPriceAttachment(chart1),
                    getStockPriceAttachment(chart2),
                    getStockPriceAttachment(chart3),
                ],"So haben sich die Aktienkurse der Unternehmen relativ zu ihrem Wert von vor einem Jahr entwickelt.");

                await step.context.sendActivity(messageWithCarouselOfCharts);

                // Create Statement
                var statement = "";
                for (var i = 0; i < 3; i++) {
                    statement = "" + statement + "\n" + statements[i];
                }

                // Interrupt flow until user klicks continue
                return await step.prompt('choicePrompt', statement, ['Weiter']);
            },
            async function (step) {

                // Determine user's payout, send information to user and save in investmentData
                if (investmentData.choice.localeCompare(investmentData.win1) == 0) {
                    await step.context.sendActivity(`Du hast in die **${investmentData.choice}** investiert. Deine Investitionssumme von 7,00€ hat sich somit auf **8,50€ erhöht** und du hast **1,50€ Gewinn gemacht**. \
                    Zusammen mit deiner Teilnahmevergütung von 3,00€ **erhältst du **nach ausfüllen des Fragebogens** am Ausgang 11,50€**.`);
                    investmentData.payout = "11,50€";
                } else if (investmentData.choice.localeCompare(investmentData.win2) == 0) {
                    await step.context.sendActivity(`Du hast in die **${investmentData.choice}** investiert. Deine Investitionssumme von 7,00€ hat sich somit auf **8,00€ erhöht** und du hast **1,00€ Gewinn gemacht**. \
                    Zusammen mit deiner Teilnahmevergütung von 3,00€ **erhältst du **nach ausfüllen des Fragebogens** am Ausgang 11,00€**.`);
                    investmentData.payout = "11,00€";
                } else if (investmentData.choice.localeCompare(investmentData.loss1) == 0) {
                    await step.context.sendActivity(`Du hast in die **${investmentData.choice}** investiert. Deine Investitionssumme von 7,00€ hat sich somit auf **6,00€ verringert** und du hast **1,00€ Verlust gemacht**. \
                    Zusammen mit deiner Teilnahmevergütung von 3,00€ **erhältst du **nach ausfüllen des Fragebogens** am Ausgang 9,00€**.`);
                    investmentData.payout = "9,00€";
                } else if (investmentData.choice.localeCompare(investmentData.loss2) == 0) {
                    await step.context.sendActivity(`Du hast in die **${investmentData.choice}** investiert. Deine Investitionssumme von 7,00€ hat sich somit auf **5,50€ verringert** und du hast **1,50€ Verlust gemacht**. \
                    Zusammen mit deiner Teilnahmevergütung von 3,00€ **erhältst du **nach ausfüllen des Fragebogens** am Ausgang 8,50€**.`);
                    investmentData.payout = "8,50€";
                }

            }
        ]));


        // Method for attaching an inline attachment to a message. For online or blob storage attachments, look into the 15.handling-attachments sample
        function getStockPriceAttachment(companyResult) {
            const imageData = fs.readFileSync(path.join(__dirname, `/resources/images/stockcharts/${companyResult}.png`));
            const base64Image = Buffer.from(imageData).toString('base64');

            return {
                name: 'pp.png',
                contentType: 'image/png',
                contentUrl: `data:image/png;base64,${ base64Image }`
            }
        }
    }




    /**
     *
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext) {
        let dc = await this.dialogSet.createContext(turnContext);
        //console.log("TurnContext Activity Type");
        //console.log(turnContext.activity.type);
        //console.log("Activity Types");
        //console.log(ActivityTypes);
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.value){
            console.log(turnContext.activity.type.value);
        }
        if (turnContext.activity.type === ActivityTypes.Message) {

            await dc.continueDialog();
    
            if (!turnContext.responded) {
                await dc.beginDialog('mainMenu');
            }
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
                        // Start the dialog.
                        await dc.beginDialog('welcome');
                    }
                }
            }
        }
    
        // Save state changes
        await this.conversationState.saveChanges(turnContext);
    }
}
exports.MyBot = MyBot;
