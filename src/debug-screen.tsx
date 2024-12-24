/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ToastAndroid,
    Image,
    Button,
    StyleSheet,
    Platform,
    useColorScheme,
    ScrollView,
    TextInput
} from 'react-native';

import { default as Ionicon } from 'react-native-vector-icons/Ionicons';
import { default as EvilIcon } from 'react-native-vector-icons/EvilIcons';

import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { PGCommands } from './commands';

export const send = async (device: BluetoothDevice | undefined, message: string) => {
    if (!device) { return false; }
    const retryTime = 10;
    let retryCount = 0;
    while (retryCount < retryTime) {
        try {
            await device?.write(message);
            console.log('Sent: ' + message);
            return true;
        } catch (e) {
            console.error(e);
            retryCount++;
            if ((e as Error).message.includes('Not connected')) {
                console.log(`Reconnecting... ${retryCount}/${retryTime}`);
                try {
                    if (!await device?.isConnected()) {
                        await device?.connect();
                    }
                    console.log('Reconnected.');
                } catch (er) {
                    console.error(er);
                    console.log('Reconnection failed.');
                }
            }
            // delay sometime
            await new Promise((resolve) => setTimeout(resolve, 5000));

        }
    }
    return false;
};

export default function DebugScreen(props: {
    currentDevice: BluetoothDevice | undefined;
}) {
    const { currentDevice } = props;

    const [messageRecieved, setMessageRecieved] = useState('');

    useEffect(() => {
        let subscription = RNBluetoothClassic.onDeviceDisconnected(
            async (event) => {
                if (event.device?.address !== currentDevice?.address) { return; }
                console.log('Device disconnected. Try to reconnect...' + (new Date()).toLocaleTimeString());
                try {
                    //await currentDevice?.disconnect();
                    await currentDevice?.connect();
                    console.log('Reconnected.');
                } catch (er) {
                    console.error(er);
                    console.log('Reconnection failed.');
                }
            });
        return () => { subscription.remove(); };
    }, [currentDevice]);

    useEffect(() => {
        /*let interval = setInterval(async () => {
            if (!currentDevice) { return; }
            if (!await currentDevice.isConnected()) {
                console.log('Device disconnected. Try to reconnect...' + (new Date()).toLocaleTimeString());
                try {
                    //await currentDevice?.disconnect();
                    await currentDevice?.connect();
                    console.log('Reconnected.');
                } catch (er) {
                    console.error(er);
                    console.log('Reconnection failed.');
                }
            }
            try {
                let available = await currentDevice.available();
                if (available > 0) {
                    let data = await currentDevice.read();
                    setMessageRecieved((prev) => `[${(new Date()).toLocaleTimeString()}] ${data}\n${prev}`);
                    console.log('Received: ' + data);
                }
            } catch (e) {
                console.error(e);
            }
        }, 50);
        return () => { clearInterval(interval); };*/
        console.log('Subscribed.');
        let subscription = currentDevice?.onDataReceived(
            async (event) => {
                setMessageRecieved((prev) => `[${event.timestamp}] ${event.data}\n${prev}`);
                console.log('Received: ' + event.data);
            });
        return () => { subscription?.remove(); };
    }, [currentDevice]);

    return (
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
            <View>
                <Text style={styles.title}>Current Device: {currentDevice ? currentDevice.name + `[${currentDevice.address}]` : 'DISCONNECTED.'}</Text>
                <DebugItem2 name="C01(Move)" onSend={(x, y) => { send(currentDevice, PGCommands.moveTo({ x, y })); }} />
                <DebugItem2 name="C09(Set)"  onSend={(x, y) => { send(currentDevice, PGCommands.setPosition({ x, y })); }} />
                <DebugItem1 name="C13(Drop)" onSend={(x)    => { send(currentDevice, PGCommands.penDown(x)); }} />
                <DebugItem1 name="C14(Lift)" onSend={(x)    => { send(currentDevice, PGCommands.penUp(x)); }} />
                <DebugItem2 name="C17(Line)" onSend={(x, y) => { send(currentDevice, PGCommands.lineTo({ x, y })); }} />
                <DebugItem0 name="INIT"      onSend={()     => { send(currentDevice, PGCommands.init()); }} />
            </View>
            <ScrollView style={{ flex: 1 }}>
                <Text style={styles.messageRecieved}>{messageRecieved}</Text>
            </ScrollView>
        </View>
    );
};

function DebugItem2(props: { name: string, onSend: (x: number, y: number) => void }) {
    const [input1, setInput1] = useState('');
    const [input2, setInput2] = useState('');
    return (
        <View style={styles.debugItemContainer}>
            <Text style={[styles.quadWidth, styles.text]}>{props.name}</Text>
            <TextInput style={[styles.quadWidth, styles.input]} inputMode="numeric" onChangeText={setInput1} />
            <TextInput style={[styles.quadWidth, styles.input]} inputMode="numeric" onChangeText={setInput2} />
            <View style={styles.quadWidth}>
                <Ionicon.Button name="send" onPress={() => props.onSend(parseInt(input1, 10), parseInt(input2, 10))}>
                    <Text style={styles.text}>Send</Text>
                </Ionicon.Button>
            </View>
        </View>
    );
}

function DebugItem1(props: { name: string, onSend: (input: number) => void }) {
    const [input, setInput] = useState('');
    return (
        <View style={styles.debugItemContainer}>
            <Text style={[styles.quadWidth, styles.text]}>{props.name}</Text>
            <TextInput style={[styles.halfWidth, styles.input]} inputMode="numeric" onChangeText={setInput} />
            <View style={styles.quadWidth}>
                <Ionicon.Button name="send" onPress={() => props.onSend(parseInt(input, 10))}><Text style={styles.text}>Send</Text></Ionicon.Button>
            </View>
        </View>
    );
}

function DebugItem0(props: { name: string, onSend: () => void }) {
    return (
        <View style={styles.debugItemContainer}>
            <Text style={[styles.quadWidth, styles.text]}>{props.name}</Text>
            <View style={styles.halfWidth} />
            <View style={styles.quadWidth}>
                <Ionicon.Button name="send" onPress={props.onSend}><Text style={styles.text}>Send</Text></Ionicon.Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    debugItemContainer: {
        justifyContent: 'space-evenly',
        flexDirection: 'row',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        margin: 12,
    },
    text: {
        fontSize: 15,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    messageRecieved: {
        fontSize: 15,
        fontFamily: 'monospace',
        margin: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ffffff77',
        borderRadius: 6,
        height: 40,
    },
    quadWidth: {
        width: '25%',
    },
    halfWidth: {
        width: '50%',
    },
});
