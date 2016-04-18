var SensorTag = require('sensortag');
var Amqp = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var tag;

// Set up IoT-Hub connection
var connectionString = 'HostName=saarivuorihub.azure-devices.net;DeviceId=Thingsee_01;SharedAccessKey=9xgqZPIwv9u+u0v1Rr6ENXr2L+Tv3IcjNkOPhyf1qVY=';
var client = Client.fromConnectionString(connectionString, Amqp);


var init = function () {
    // Connect to Azure IoT Hub
    var connectCallback = function (err) {
            if (err) {
                    console.err('Could not connect: ' + err.message);
            } else {
                    console.log('IoT Hub connected');
                    client.on('message', function (msg) {
                        if (msg.data == "start")
                        {
                            enableIrTemp();
                        }
                        if (msg.data == "stop")
                        {
                            disableIrTemp();
                        }
                        console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
                        client.complete(msg, printResultFor('completed'));
                    });
            }
    };
    client.open(connectCallback);

    // Discover sensors and set up
    console.log('Waiting for sensor');
    SensorTag.discover(function (t) {
        console.log('SensorTag Discovered');
        console.log('Type: ', t.type);
        console.log('UUID: ', t.uuid);
        tag = t;

        tag.on('disconnect', function() {
                console.log('Disconnected!');
                process.exit(0);
        });

        tag.on('simpleKeyChange', function(left, right, reedRelay) {
                console.log('Key pressed');
                console.log('Disconnecting...');
                tag.disconnect();
        });

        tag.connectAndSetUp(startKeyNotification);
    });
    

};

// Enable TI Temp Service
function enableIrTemp() {
    tag.setIrTemperaturePeriod(3000);
    tag.enableIrTemperature();
    tag.notifyIrTemperature(listenForTempReading);
    console.log('IR Temperature sensor enabled');
};

// Disable TI TempService
function disableIrTemp() {
    tag.unnotifyIrTemperature(listenForTempReading);
    tag.disableIrTemperature();
    console.log('IR Temperature sensor disable');
};

// Start TI Key Notification
function startKeyNotification() {
    console.log('Stop by pressing button');
    tag.notifySimpleKey();
};

// Listen For Changes
function listenForTempReading() {
        tag.on('irTemperatureChange', function (objectTemp, ambientTemp) {
        console.log('\tObject Temp = %d deg. C', objectTemp.toFixed(1));
        console.log('\tAmbient Temp = %d deg. C', ambientTemp.toFixed(1));
                var data = JSON.stringify({ deviceId: tag.uuid, objectTemp: Number(objectTemp.toFixed(1)), ambientTemp: Number(ambientTemp.toFixed(1)) });
                var message = new Message(data);
                message.properties.add('myproperty', 'myvalue');
                console.log('Sending message: ' + message.getData());
                client.sendEvent(message, printResultFor('send'));
    });
};

// Helper function to print results in the console
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

//Start
init();
