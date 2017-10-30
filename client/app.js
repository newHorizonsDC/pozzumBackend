const SERVER_IP = "127.0.0.1"

$("#dcform").submit(connectTo);
$("#sendform").submit(sendDirect);

$("#dc-connect").click(connectTo);
$("#send").click(sendDirect);

$("#status").show();
$("#dcform").hide();
$("#sendform").hide();


var ws = null;
var user2 = "";

var config = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
var connection = {};

var peerConnection;
var dataChannel;



function connectTo(e){
    e.preventDefault();
    user2 = $("#connectTo").val();
    openDataChannel();

    var sdpConstraints = { offerToReceiveAudio: false,  offerToReceiveVideo: false }
    peerConnection.createOffer(sdpConstraints).then(function (sdp) {
        peerConnection.setLocalDescription(sdp);
        sendNegotiation("offer", sdp);
        console.log("------ SEND OFFER ------");
    }, function (err) {
        console.log(err)
    });

}

function sendDirect(e){
    e.preventDefault();
    dataChannel.send($("#message").val());
    $('body').append('Me: <div class="message">'+$("#message").val()+'</div>');
    console.log("Sending over datachannel: " + $("#message").val());
    $("#message").val('');
}

function getURLParameter(name) {
return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}


function openDataChannel (){
    peerConnection = new webkitRTCPeerConnection(config, connection);
    peerConnection.onicecandidate = function(e){
        if (!peerConnection || !e || !e.candidate) return;
        var candidate = event.candidate;
        sendNegotiation("candidate", candidate);
    }

    dataChannel = peerConnection.createDataChannel("datachannel", {reliable: false});

    dataChannel.onopen = function(){
        console.log("------ DATACHANNEL OPENED ------")
        $("#sendform").show();
    };
    dataChannel.onclose = function(){console.log("------ DC closed! ------")};
    dataChannel.onerror = function(){console.log("DC ERROR!!!")};

    peerConnection.ondatachannel = function (ev) {
        console.log('peerConnection.ondatachannel event fired.');
        ev.channel.onopen = function() {
            console.log('Data channel is open and ready to be used.');
        };
        ev.channel.onmessage = function(e){
            console.log("DC from ["+user2+"]:" +e.data);
            $('body').append(user2+': <div class="message from">'+e.data+'</div>')
        }
    };

    return peerConnection
}

function sendNegotiation(type, sdp){
    var json = { to: user2, action: type, data: sdp};
    ws.send(JSON.stringify(json));
    console.log("Sending to ["+user2+"]: " + JSON.stringify(sdp));
}

function processOffer(offer){
    var peerConnection = openDataChannel();
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).catch(e => {
        console.log(e)
    });

    var sdpConstraints = {'mandatory':
        {
            'OfferToReceiveAudio': false,
            'OfferToReceiveVideo': false
        }
    };

    peerConnection.createAnswer(sdpConstraints).then(function (sdp) {
        return peerConnection.setLocalDescription(sdp).then(function() {            
            sendNegotiation("answer", sdp);
            console.log("------ SEND ANSWER ------");
        })
    }, function(err) {
        console.log(err)
    });
    console.log("------ PROCESSED OFFER ------");

};

function processAnswer(answer){

    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("------ PROCESSED ANSWER ------");
    return true;
};

function processIce(iceCandidate){
    peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(e => {
        debugger
        console.log(e)
    })
}

(function(){

    ws = new WebSocket("ws://" + SERVER_IP + ":8088/" + document.cookie);

    ws.onopen = function(e){
        console.log("Websocket opened");
        $("#status").hide();
        $("#dcform").show();
    }
    ws.onclose = function(e){
        console.log("Websocket closed");
    }
    ws.onmessage = function(e){
        console.log("Websocket message received: " + e.data);

        var json = JSON.parse(e.data);

        if(json.action == "candidate"){
            processIce(json.data);
        } else if(json.action == "offer"){
            // incoming offer
            user2 = json.from;
            processOffer(json.data)
        } else if(json.action == "answer"){
            // incoming answer
            processAnswer(json.data);
        } 
        // else if(json.action == "id"){
        //    userId = json.data;
        // } else if(json.action=="newUser"){
        //     if(userId!=null && json.data!=userId){

        //     }
        // }

    }
    ws.onerror = function(e){   
        console.log("Websocket error");
    }
    return false;
})();
