/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo } from 'react';
import {
    PermissionsAndroid,
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
} from 'react-native';
import { default as Ionicon } from 'react-native-vector-icons/Ionicons';
import { default as EvilIcon } from 'react-native-vector-icons/EvilIcons';
import { NavigationContainer } from '@react-navigation/native';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ImagePickerAPI from './image-screen';
import DeviceListScreen from './device-list-screen';
import DebugScreen from './debug-screen';

import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { PGCommands } from './commands';
//import svg2Commands from './svg-to-commands';

interface DeviceContextValue {
    currentDevice: BluetoothDevice | undefined;
    setCurrentDevice: (device: BluetoothDevice | undefined) => void;
}
const DeviceContext = React.createContext<DeviceContextValue | undefined>(undefined);

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
    const { currentDevice, setCurrentDevice } = React.useContext(DeviceContext)!;
    return (
        <>
            <Button onPress={() => console.log((`<svg viewBox = " 0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" />
</svg>`))}  title="test" />
        </>
    );
};

const _DeviceListScreen = () => {
    const [bluetoothEnabled, setBluetoothEnabled] = React.useState(false);
    const { currentDevice, setCurrentDevice } = React.useContext(DeviceContext)!;

    useEffect(() => {
        RNBluetoothClassic.requestBluetoothEnabled().then((setBluetoothEnabled));
    }, []);

    return <DeviceListScreen bluetoothEnabled={bluetoothEnabled} currentDevice={currentDevice} setCurrentDevice={setCurrentDevice} />;
};
const _ImageScreen = () => {
    const [bluetoothEnabled, setBluetoothEnabled] = React.useState(false);
    const { currentDevice, setCurrentDevice } = React.useContext(DeviceContext)!;

    useEffect(() => {
        RNBluetoothClassic.requestBluetoothEnabled().then((setBluetoothEnabled));
    }, []);

    return <ImagePickerAPI device={currentDevice} />;
};

const _DebugScreen = () => {
    //const [bluetoothEnabled, setBluetoothEnabled] = React.useState(false);
    const { currentDevice, setCurrentDevice } = React.useContext(DeviceContext)!;

    /*useEffect(() => {
        RNBluetoothClassic.requestBluetoothEnabled().then((setBluetoothEnabled));
    }, []);*/

    return <DebugScreen currentDevice={currentDevice} />;
};

function App(): React.JSX.Element {
    const [currentDevice, setCurrentDevice] = React.useState<BluetoothDevice | undefined>(undefined);
    const contextValue = useMemo(() => ({ currentDevice, setCurrentDevice }), [currentDevice, setCurrentDevice]);
    const scheme = useColorScheme();
    return (
        <DeviceContext.Provider value={contextValue}>
            <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Tab.Navigator
                    screenOptions={({ route }) => ({
                        // eslint-disable-next-line react/no-unstable-nested-components
                        tabBarIcon: ({ focused, color, size }) => {
                            let iconName: string = {
                                'Home': 'information-circle',
                                'Image': 'image',
                                'Devices': 'bluetooth',
                                'Debug': 'bug',
                            }[route.name] ?? '';

                            if (!focused) {
                                iconName += '-outline';
                            }

                            return <Ionicon name={iconName} size={size} color={color} />;
                        },
                    })}>
                    <Tab.Screen name="Home" component={HomeScreen} />
                    <Tab.Screen name="Image" component={_ImageScreen} />
                    <Tab.Screen name="Devices" component={_DeviceListScreen} />
                    <Tab.Screen name="Debug" component={_DebugScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </DeviceContext.Provider>
    );
}

const styles = StyleSheet.create({
    deviceListItem: {
        borderRadius: 15,
        backgroundColor: '#ffffff20',
        margin: 8,
        padding: 12,
    },
    deviceListItemIcon: {
        marginLeft: 2,
        marginRight: 10,
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

export default App;
