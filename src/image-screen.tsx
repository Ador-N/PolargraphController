/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useCallback } from 'react';
import { View, Image, StyleSheet, Button, Text, ToastAndroid } from 'react-native';
import { Slider, RangeSlider } from '@react-native-assets/slider';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ImageLibraryOptions, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import Ionicon from 'react-native-vector-icons/Ionicons';
import AntdIcon from 'react-native-vector-icons/Fontisto';
import { pick, DocumentPickerOptions } from 'react-native-document-picker';
import { SvgWithCss } from 'react-native-svg/css';

import machine_properties from './machine-properties';
const { paper_width, paper_height } = machine_properties;
import { PositionXY, getXYFromAB } from './utils';
import { flattenSVG, Line } from 'flatten-svg';
import { createSVGDocument } from 'svgdom';
import { PGCommands } from './commands';
import { BluetoothDevice } from 'react-native-bluetooth-classic';

import { send } from './debug-screen';
import { BorderTypes, ContourApproximationModes, DataTypes, ObjectType, OpenCV, PointVectorOfVectors, RetrievalModes } from 'react-native-fast-opencv';


interface ImageData {
    base64Original: string;
    base64Traced?: string;
    width: number;
    height: number;
}

interface SvgData {
    xmlText: string;
    width: number;
    height: number;
}

interface Rect {
    width: number;
    height: number;
}

const paperScale = 1.5;


export default function ImagePickerAPI(props: { device?: BluetoothDevice }) {

    const { device } = props;
    const [imageData, setImageData] = React.useState<ImageData>();
    const [svgData, setSvgData] = React.useState<SvgData>();
    const [lineData, setLineData] = React.useState<PositionXY[][]>([]);
    const [zoomViewState, setZoomViewState] = React.useState({ zoomLevel: 1, offsetX: 0, offsetY: 0 });
    const [currentPosition, setCurrentPosition] = React.useState<PositionXY>({ x: 0, y: 0 });
    const [forceContinue, setForceContinue] = React.useState(false);

    const [cannyBlur, setCannyBlur] = React.useState(5);
    const [cannyThreshold, setCannyThreshold] = React.useState<[number, number]>([50, 150]);

    let onPickImage = async () => {
        const options: ImageLibraryOptions = {
            mediaType: 'photo',
            videoQuality: 'high',
            includeBase64: true,
        };

        let response = await launchImageLibrary(options);
        if (response.didCancel) {
            console.log('Action cancelled.');
        }
        else if (response.errorCode) {
            console.log('Error: ', response.errorMessage);
        }
        else {
            setSvgData(undefined);
            setImageData(undefined);
            setLineData([]);
            setZoomViewState({ zoomLevel: 1, offsetX: 0, offsetY: 0 });
            setImageData({
                base64Original: response.assets![0].base64!,
                width: response.assets![0].width!,
                height: response.assets![0].height!,
            });
        }
    };

    let canny = () => {
        if (!imageData) {
            throw new Error('No image data found.');
        }
        let mat = OpenCV.base64ToMat(imageData.base64Original);
        let matJS = OpenCV.toJSValue(mat);
        console.log(matJS.rows, matJS.cols);
        let blur = OpenCV.createObject(ObjectType.Mat, matJS.rows, matJS.cols, DataTypes.CV_8U);
        let result = OpenCV.createObject(ObjectType.Mat, matJS.rows, matJS.cols, DataTypes.CV_8U);
        let contours: PointVectorOfVectors = OpenCV.createObject(ObjectType.PointVectorOfVectors);
        //let contoursMat = OpenCV.createObject(ObjectType.Mat, matJS.rows, matJS.cols, DataTypes.CV_8U);
        OpenCV.invoke('blur', mat, blur, OpenCV.createObject(ObjectType.Size, cannyBlur, cannyBlur), OpenCV.createObject(ObjectType.Point, -1, -1), BorderTypes.BORDER_DEFAULT);
        OpenCV.invoke('Canny', blur, result, ...cannyThreshold);

        OpenCV.invoke('findContours', result, contours, RetrievalModes.RETR_LIST, ContourApproximationModes.CHAIN_APPROX_TC89_KCOS);
        let lines = OpenCV.toJSValue(contours).array;
        console.log(lines);
        setImageData({ ...imageData, base64Traced: OpenCV.toJSValue(result).base64 });
        setLineData(lines);
    };

    let onPickSvg = async () => {
        const options: DocumentPickerOptions = {
            type: '*/svg+xml',
            mode: 'open',
            copyTo: 'cachesDirectory',
        };

        let [response] = await pick(options);
        setSvgData(undefined);
        setImageData(undefined);
        setZoomViewState({ zoomLevel: 1, offsetX: 0, offsetY: 0 });
        let uri = response.fileCopyUri;
        //uri = uri.replace(/^content:\/\/bin\.mt\.plus\.fp/, 'file://'); // Debug
        if (uri) {
            console.log(uri);
            let svgResponse = await fetch(uri);
            let xmlText = await svgResponse.text();
            let matchResult = xmlText.match(/viewBox\s*=\s*"\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*"/);
            if (!matchResult) {
                console.error('No viewBox found in svg file: ' + response.name);
                return;
            }
            let tmpSvgData = {
                xmlText,
                width: parseFloat(matchResult[1]),
                height: parseFloat(matchResult[2]),
            };
            const window = createSVGDocument();
            (window.documentElement as any).innerHTML = xmlText;
            const lines = flattenSVG(window.documentElement);

            setLineData(lines.map((line) => line.points.map((point) => { return { x: point[0], y: point[1] }; })));
            setSvgData(tmpSvgData);
        } else {
            console.error(response.copyError);
        }
    };

    let refresh = () => {
        setZoomViewState({ zoomLevel: 1, offsetX: 0, offsetY: 0 });
        if (imageData) {
            let data = imageData;
            setImageData(undefined);
            setImmediate(() => setImageData(data));
        }
        if (svgData) {
            let data = svgData;
            setSvgData(undefined);
            setImmediate(() => setSvgData(data));
        }
    };

    let getScale = (svgSize: Rect, paperViewSize: Rect = { width: paper_width * paperScale, height: paper_height * paperScale }) =>
        Math.min(paperViewSize.width / svgSize.width, paperViewSize.height / svgSize.height);

    let svgToPaperPosition = (
        svgPosition: PositionXY,
        svgSize: Rect,
        paperViewSize: Rect = { width: paper_width * paperScale, height: paper_height * paperScale }
    ) => {
        let scale = getScale(svgSize, paperViewSize);
        let initialScaledXY = { x: svgPosition.x * scale, y: svgPosition.y * scale };
        let initialMovedXY = { x: (/*paperViewSize.width*/ -svgSize.width * scale) / 2 + initialScaledXY.x, y: (/*paperViewSize.height*/ -svgSize.height * scale) / 2 + initialScaledXY.y };
        let zoomViewedXY = { x: (initialMovedXY.x + zoomViewState.offsetX) * zoomViewState.zoomLevel, y: (initialMovedXY.y + zoomViewState.offsetY) * zoomViewState.zoomLevel };
        let paperScaledXY = { x: zoomViewedXY.x / paperScale, y: (zoomViewedXY.y + paperViewSize.height / 2) / paperScale };
        //console.log(initialScaledXY, initialMovedXY, zoomViewedXY, paperScaledXY, zoomViewState);
        return paperScaledXY;
    };

    let generateCommands = () => {
        if (lineData.length === 0) {
            throw new Error('No line data found.');
        }

        let lines = lineData.map((line) => line.map((point) => svgToPaperPosition(point, (svgData || imageData)!)));

        const commands = [];
        //commands.push(PGCommands.init());
        commands.push(PGCommands.penUp());
        commands.push(PGCommands.setPosition({ x: 0, y: 0 }));
        for (const line of lines) {
            commands.push(PGCommands.lineTo(line[0]));
            commands.push(PGCommands.penDown());
            for (let i = 1; i < line.length; i++) {
                commands.push(PGCommands.lineTo(line[i]));
            }
            commands.push(PGCommands.penUp());
        }
        commands.push(PGCommands.lineTo({ x: 0, y: 0 }));
        //console.log(commands);
        //console.log(linesScaled);
        return commands;
    };

    let startDrawing = async () => {
        if (!device || !await device.isConnected()) {
            throw new Error('Device not connected.');
        }
        let commands = generateCommands();
        console.log(commands);
        for (let command of commands) {
            try {
                if (command.startsWith('C13')) {
                    console.log('PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN PEN DOWN ');
                }
                if (command.startsWith('C14')) {
                    console.log('PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP PEN UP ');
                }
                if (command.startsWith('C13') || command.startsWith('C14')) { // For pen up/down commands, no need to wait for response.
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                await send(device, command);
                if (command.startsWith('C13') || command.startsWith('C14')) { // For pen up/down commands, no need to wait for response.
                    await new Promise((resolve) => setTimeout(resolve, 6500));
                }
                if (!command.startsWith('C17') && !command.startsWith('C09')) {
                    continue;
                }
                while (true) {
                    while (await device.available() <= 0) {
                        await new Promise((resolve) => setTimeout(resolve, 15));
                    }
                    console.log('cnm');
                    if (forceContinue) {
                        setForceContinue(false);
                        break;
                    }
                    let response = await device.read();
                    console.log('Received: ' + response);
                    if (response.startsWith('SYNC')) {
                        let result = response.match(/SYNC,(\d+),(\d+)/);
                        if (result) {
                            let [_, a, b] = result;
                            setCurrentPosition(getXYFromAB({ a: parseInt(a, 10), b: parseInt(b, 10) }));
                        }
                        //await new Promise((resolve) => setTimeout(resolve, 10));
                        break;
                    } else if (response !== 'READY') {
                        ToastAndroid.show('Response: ' + response, ToastAndroid.SHORT);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={styles.imageContainer}>
                <View style={{ width: '50%', height: '100%', position: 'absolute', right: '50%', top: 1, borderColor: 'silver', borderTopWidth: 1, borderRightWidth: 1 }} />
                <View style={{ width: '50%', height: '100%', position: 'absolute', left: '50%', top: 1, borderColor: 'silver', borderTopWidth: 1, borderLeftWidth: 1 }} />
                {
                    imageData || svgData ? (
                        <ReactNativeZoomableView
                            maxZoom={10}
                            minZoom={0.1}
                            zoomStep={0.5}
                            initialZoom={1}
                            bindToBorders={false}
                            onShiftingEnd={(_, __, event) => setZoomViewState(event)}
                            onZoomEnd={(_, __, event) => setZoomViewState(event)}
                            onDoubleTapAfter={(_, event) => setZoomViewState(event)}
                        >
                            {imageData ? <Image source={{ uri: `data:image;base64,${imageData.base64Traced || imageData.base64Original}` }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : undefined}
                            {svgData ? <>
                                <View style={[{ width: svgData.width * getScale(svgData), height: svgData.height * getScale(svgData) }, styles.imageFrameShower]} />
                                <SvgWithCss xml={svgData.xmlText} width="100%" height="100%" />
                            </> : undefined}
                        </ReactNativeZoomableView>

                    ) : undefined
                }
                <View style={styles.homeButton}>
                    <Ionicon.Button name="home" onPress={refresh} iconStyle={styles.iconButton} />
                </View>
                <View style={styles.imageButton}>
                    <Ionicon.Button name="image" onPress={onPickImage} iconStyle={styles.iconButton} />
                </View>
                <View style={styles.svgButton}>
                    <Ionicon.Button name="code-slash" onPress={onPickSvg} iconStyle={styles.iconButton} />
                </View>
                <View style={[styles.tracer, { top: currentPosition.y * paperScale - 2.5, left: (currentPosition.x + paper_width / 2) * paperScale - 2.5 }]} />
            </View>
            <View style={styles.argumentWrapper}>
                <Button title="draw" onPress={startDrawing} />
                <Button title="force continue" onPress={() => setForceContinue(true)} />
                <Button title="convert" onPress={canny} />
            </View>
            <Text>{`(${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)})`}</Text>
            <View style={styles.argumentWrapper}>
                <Text style={styles.argumentLabel} >Blur</Text>
                <Slider minimumValue={1} maximumValue={10} trackHeight={4} thumbSize={15} minimumTrackTintColor="darkcyan" style={styles.argumentSlider} onValueChange={setCannyBlur} onSlidingComplete={canny} />
            </View>
            <View style={styles.argumentWrapper}>
                <Text style={styles.argumentLabel} >Threshold</Text>
                <RangeSlider minimumValue={0} maximumValue={255} trackHeight={4} thumbSize={15} inboundColor="darkcyan" style={styles.argumentSlider} onValueChange={setCannyThreshold} onSlidingComplete={canny} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    imageContainer: {
        height: paperScale * paper_height,
        width: paperScale * paper_width,
        backgroundColor: '#eee',
    },
    homeButton: {
        position: 'absolute',
        left: 10,
        bottom: 55,
    },
    imageButton: {
        position: 'absolute',
        left: 10,
        bottom: 10,
    },
    svgButton: {
        position: 'absolute',
        right: 10,
        bottom: 10,
    },
    iconButton: {
        marginRight: 0,
    },
    imageFrameShower: {
        position: 'absolute',
        borderColor: 'gray',
        backgroundColor: '#eeea',
        borderWidth: 1,
    },
    tracer: {
        width: 0,
        height: 0,
        position: 'absolute',
        borderColor: 'red',
        borderWidth: 2.5,
        borderRadius: 2.5,
    },
    argumentWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
    },
    argumentLabel: {
        flex: 1,
        textAlign: 'center',
        textAlignVertical: 'center',
        paddingLeft: 20,
    },
    argumentSlider: {
        flex: 3,
        paddingRight: 20,
        paddingLeft: 20,
        height: 30,
    },
});
