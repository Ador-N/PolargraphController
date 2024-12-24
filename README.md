# Polargraph Controller

## 简介

2024 年清华大学第 27 届硬件设计大赛 优胜奖作品：极坐标绘图仪

此仓库是面向 Arduino Sever [polargraph_server_a1](https://github.com/euphy/polargraph_server_a1) 开发的 Android 端控制程序，基于 React Native。

## 主要功能

* 将 SVG 路径采样为折线段；
* 利用 OpenCV 将位图转换为线稿；
* 生成对应的绘图指令，并通过蓝牙串口发送至 Server 端；

## 鸣谢

* [polargraph_server_a1](https://github.com/euphy/polargraph_server_a1) 

* [react-native-bluetooth-classic](https://github.com/kenjdavidson/react-native-bluetooth-classic)

* [react-native-fast-opencv](https://github.com/lukaszkurantdev/react-native-fast-opencv)