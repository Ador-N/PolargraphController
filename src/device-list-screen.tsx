/**
 * Represents the DeviceListScreen component.
 *
 * @component
 * @example
 * ```tsx
 * <DeviceListScreen
 *    bluetoothEnabled={true}
 *    currentDevice={currentDevice}
 *    setCurrentDevice={setCurrentDevice}
 * />
 * ```
 */
import React, { useEffect, useRef } from 'react';
import {
    PermissionsAndroid,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ToastAndroid,
    Button,
    StyleSheet,
    Platform,
    Animated,
    Easing,
    StyleProp,
    ViewStyle,
} from 'react-native';
import { default as Ionicon } from 'react-native-vector-icons/Ionicons';
import { default as EvilIcon } from 'react-native-vector-icons/EvilIcons';

import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';


const requestAccessFineLocationPermission = async () => {
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
            title: 'Access fine location required for discovery',
            message:
                'In order to perform discovery, you must enable/allow ' +
                'fine location access.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
        }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
};


/**
 * Renders the device list screen.
 *
 * @param props - The component props.
 * @param props.bluetoothEnabled - Indicates if Bluetooth is enabled.
 * @param props.currentDevice - The currently selected Bluetooth device.
 * @param props.setCurrentDevice - Callback function to set the current Bluetooth device.
 * @returns The rendered device list screen.
 */
export default function DeviceListScreen(props: {
    bluetoothEnabled: boolean;
    currentDevice: BluetoothDevice | undefined;
    setCurrentDevice: (arg0: BluetoothDevice) => void;
}): React.JSX.Element {

    const [devices, setDevices] = React.useState<BluetoothDevice[]>([]);
    const [discovering, setDiscovering] = React.useState<boolean>(false);
    const [refreshing, setRefreshing] = React.useState<boolean>(false);
    const [tryConnectingDevice, setTryConnectingDevice] = React.useState<BluetoothDevice | undefined>(undefined);

    async function getBondedDevices(unloading: boolean = false) {
        setRefreshing(true);
        console.log('DeviceListScreen::getBondedDevices');
        try {
            let bonded: BluetoothDevice[] = await RNBluetoothClassic.getBondedDevices();
            console.log('DeviceListScreen::getBondedDevices found', bonded);

            if (!unloading) {
                setDevices(bonded);
            }
        } catch (error) {
            setDevices([]);
            ToastAndroid.show('fuck', ToastAndroid.LONG);
        }
        setRefreshing(false);
    }

    useEffect(() => {
        getBondedDevices();
    }, []);

    /*async function acceptConnections() {
        if (accepting) {
            ToastAndroid.show(
                'Already accepting connections',
                ToastAndroid.LONG
            );

            return;
        }

        setAccepting(true);

        try {
            let device = await RNBluetoothClassic.accept({ delimiter: '\n' });
            if (device) {
                props.selectDevice(device);
            }
        } catch (error) {
            // If we're not in an accepting state, then chances are we actually
            // requested the cancellation.  This could be managed on the native
            // side but for now this gives more options.
            if (!accepting) {
                ToastAndroid.show(
                    'Attempt to accept connection failed.',
                    ToastAndroid.LONG
                );
            }
        } finally {
            setAccepting(false);
        }
    }

    async function cancelAcceptConnections() {
        if (!accepting) {
            return;
        }

        try {
            let cancelled = await RNBluetoothClassic.cancelAccept();
            setAccepting(!cancelled);
        } catch (error) {
            ToastAndroid.show(
                'Unable to cancel accept connection',
                ToastAndroid.SHORT,
            );
        }
    }*/



    /**
     * Starts the discovery process for Bluetooth devices.
     *
     * @returns {Promise<void>} A promise that resolves when the discovery process is complete.
     * @throws {Error} If access fine location permission is not granted.
     */
    async function startDiscovery() {
        try {
            let granted = await requestAccessFineLocationPermission();

            if (!granted) {
                throw new Error('Access fine location was not granted');
            }

            setDiscovering(true);
            setRefreshing(true);

            let newDevices = [...devices];

            try {
                let unpaired = await RNBluetoothClassic.startDiscovery();

                let index = newDevices.findIndex(d => !d.bonded);
                if (index >= 0) { newDevices.splice(index, newDevices.length - index, ...unpaired); }
                else { newDevices.push(...unpaired); }

                newDevices = newDevices.filter((device) => device.address !== device.name);

                ToastAndroid.show(
                    `Found ${unpaired.length} unpaired devices.`,
                    2000
                );
            } finally {
                setDevices(newDevices);
                setDiscovering(false);
                setRefreshing(false);
            }
        } catch (err) {
            ToastAndroid.show(
                (err as Error).message,
                2000
            );
        }
    }

    /**
     * Cancels the device discovery process.
     *
     * @returns {Promise<void>} A promise that resolves when the discovery process is canceled.
     */
    async function cancelDiscovery() {
        try {
            await RNBluetoothClassic.cancelDiscovery();
            setRefreshing(false);
        } catch (error) {
            ToastAndroid.show(
                'Error occurred while attempting to cancel discover devices',
                2000,
            );
        }
    }

    /**
     * Requests to enable Bluetooth and logs the result.
     *
     * @returns {Promise<void>} A promise that resolves when the request is completed.
     */
    async function requestEnabled() {
        try {
            console.log(await RNBluetoothClassic.requestBluetoothEnabled());
        } catch (error) {
            ToastAndroid.show(
                `Error occurred while enabling bluetooth: ${(error as Error).message}`,
                2000,
            );
        }
    }

    /*let toggleAccept = accepting
        ? () => cancelAcceptConnections()
        : () => acceptConnections();*/

    let toggleDiscovery = discovering
        ? () => cancelDiscovery()
        : () => startDiscovery();

    let selectDevice = async (device: BluetoothDevice) => {
        try {
            await props.currentDevice?.disconnect();
        } catch (error) {
            if (!(error as Error).message.includes('Not connected')) {
                console.error('Error disconnecting from current device: ', error);
                return false;
            }
        }
        try {
            setTryConnectingDevice(device);
            await device.connect();
        } catch (error) {
            console.error('Error connecting to device: ', error);
            ToastAndroid.show(
                `Could not connect to device: ${(error as Error).message}`,
                2000,
            );
            return false;
        }
        finally {
            setTryConnectingDevice(undefined);
        }
        await props.setCurrentDevice(device);
        return true;
    };

    const renderItem = ({ item }: { item: BluetoothDevice }) => {

        let bgColor: string = item.address === props.currentDevice?.address ? '#0f0' : '#fff';
        let icon: string = item.bonded ? 'bluetooth' : 'cellular';
        return (
            <DeviceListItem
                device={item}
                onSelectDevice={selectDevice}
                onLongPress={undefined}
                bgColor={bgColor}
                icon={icon}
                connecting={tryConnectingDevice === item}
            />
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {props.bluetoothEnabled ? (
                <>
                    <FlatList
                        data={devices}
                        renderItem={renderItem}
                        keyExtractor={item => item.address}
                        extraData={props.currentDevice}
                        onRefresh={() => getBondedDevices(false)}
                        refreshing={refreshing}
                        removeClippedSubviews={false}
                        ListHeaderComponent={(
                            <></>//<Text>test</Text>
                        )}
                        style={{paddingVertical: 18}}
                    />
                    {Platform.OS !== 'ios' ? (
                        <Button onPress={toggleDiscovery} title={discovering ? 'Discovering (cancel)...' : 'Discover Devices'} />
                    ) : (
                        undefined
                    )}
                </>
            ) : (
                <View>
                    <Text>Bluetooth is OFF</Text>
                    <Button title="Enable Bluetooth" onPress={() => requestEnabled()} />
                </View>
            )}
        </View>
    );
}


/**
 * Renders a single device item in the device list.
 *
 * @param props - The component props.
 * @param props.device - The Bluetooth device object.
 * @param props.onSelectDevice - The callback function to handle device selection.
 * @param props.onLongPress - The optional callback function to handle long press event.
 * @param props.icon - The icon name for the device.
 * @param props.bgColor - The background color for the device.
 * @returns The rendered device list item component.
 */
export function DeviceListItem(props: {
    device: BluetoothDevice;
    onSelectDevice: (device: BluetoothDevice) => void;
    onLongPress: ((device: BluetoothDevice) => void) | undefined;
    icon: string;
    bgColor: string;
    connecting: boolean;
}): React.JSX.Element {

    return (
        <TouchableOpacity
            onPress={() => props.onSelectDevice(props.device)}
            onLongPress={() => props.onLongPress && props.onLongPress(props.device)}
            style={styles.deviceListItem}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={styles.deviceListItemIcon}>
                    <Ionicon name={props.icon} color={props.bgColor} size={30} style={{ lineHeight: 40 }} />
                </View>
                <View>
                    <Text style={styles.deviceName}>{props.device.name}</Text>
                    <Text style={styles.note}>{props.device.address}</Text>
                </View>
                <LoadingIcon show={props.connecting} style={[styles.deviceListItemLoadIcon]} />
            </View>
        </TouchableOpacity>
    );
};

/**
 * Renders a loading icon.
 *
 * @returns The rendered loading icon component.
 */
let LoadingIcon = (props: { show: boolean, style?: StyleProp<ViewStyle> }) => {
    const rotateValue = useRef(new Animated.Value(0)).current;
    const anim = Animated.loop(
        Animated.timing(
            rotateValue,
            {
                toValue: 360,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            }
        )
    );
    useEffect(() => { anim.reset(); anim.start(); }, [anim, props.show]);

    let deg = rotateValue.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
    });
    return (
        <Animated.View style={[{ transform: [{ rotate: deg }] }, props.style]}>
            {props.show ? (<EvilIcon name="spinner-3" color="#ffffff77" size={30} style={{ lineHeight: 40 }} />) : (<></>)}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    deviceListItem: {
        borderRadius: 18,
        borderCurve: 'continuous',
        backgroundColor: '#ffffff20',
        marginBottom: 18,
        marginHorizontal: 15,
        padding: 12,
    },
    deviceListItemIcon: {
        marginLeft: 2,
        marginRight: 10,
    },
    deviceListItemLoadIcon: {
        marginRight: 2,
        position: 'absolute',
        right: 0,
    },
    deviceName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    note: {
        fontSize: 10,
        opacity: 0.6,
    },
});
