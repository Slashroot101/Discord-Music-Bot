const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = require('./config');

var ytApi = config.ytApi;
var botController = config.bot_controller;
var discordToken = config.discord_token;
var prefix = config.prefix;


var queue = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];

client.login(discordToken);

client.on('message', function(message){
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");
    if(mess.startsWith(prefix + "play")){
        if(member.voiceChannel || client.guilds.get("315255146508713984").voiceConnection != null){
        if(queue.length > 0 || isPlaying) {
            getID(args, function(id){
                addToQueue(id);
                fetchVideoInfo(id, function(err, videoInfo){
                    if(err) throw new Error(err);
                    message.reply(" added to queue **" + videoInfo.title + "**");
                });
            });
        } else {
            isPlaying = true;
            getID(args, function(id){
                queue.push("placeholder");
                playMusic(id, message);
                fetchVideoInfo(id, function(err, videoInfo){
                    if(err) throw new Error(err);
                    message.reply(" now playing **" + videoInfo.title + "**");
                });
            });
        }
    } else {
        message.reply(' you need to be in a voice channel!');
    }
    } else if (mess.startsWith(prefix + 'skip')){
        if(skippers.indexOf(message.author.id) === -1){
            skippers.push(message.author.id);
            skipReq++;
            if(skipReq >= Math.ceil((voiceChannel.members.size - 1) / 2)){
                skipSong(message);
                message.reply(' your skip has been approved. Skipping now!');
            } else {
                message.reply(' your skip has been acknowledged. You need **' + (Math.ceil(voiceChannel.members.size - 1 / 2) - skipReq) + '** more skip votes');
            }
        } else {
            message.reply(' you already voted to skip!');
        }
    } 

});

client.on('ready', function(){
    console.log("I am ready!");
    console.log(ytApi);
});


function isYoutube(str){
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

function searchVideo(query, callback){
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&query=" + encodeURIComponent(query) + "&key=" + ytApi, function(error, body){
        var json = JSON.parse(body);
        callback(json.items[0].id.videoId);
    });
}

function getID(str, cb){
    if(isYoutube(str)){
        cb(getYouTubeID(str));
    } else {
        searchVideo(str, function(id){
            cb(id);
        });
    }
}

function addToQueue(strID){
    if(isYoutube(strID)){
        queue.push(getYouTubeID(strID));

    } else {
        queue.push(strID);
    }
}

function playMusic(id, message){
    voiceChannel = message.member.voiceChannel;

    voiceChannel.join().then(function(connection){
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: 'audioonly'
        });
        skipRequest = 0;
        skippers = [];

        dispatcher = connection.playStream(stream);
        dispatcher.on('end', function(){
            skipReq = 0;
            skippers = [];
            queue.shift();
            if(queue.length === 0){
                queue = [];
                isPlaying  = false;
            } else {
                playMusic(queue[0], message);
            }
        });
    });
}

function skipSong(message){
    dispatcher.end();
    if(queue.length > 1){
        playMusic(queue[0], message);
    } else {
        skipReq = 0;
        skippers = [];
    }
}

