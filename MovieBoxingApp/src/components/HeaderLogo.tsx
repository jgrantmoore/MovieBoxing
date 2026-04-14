import React from 'react';
import { View, Text, Image } from 'react-native';

// Import your local assets - adjust paths as needed
const BoxingGloveL = require('../../assets/images/boxingloveL.png');
const BoxingGloveR = require('../../assets/images/boxingloveR.png');

export const HeaderLogo = () => {
  return (
    <View className="flex-row items-center justify-center">
      <Image 
        source={BoxingGloveL} 
        style={{ width: 30, height: 30 }} 
        resizeMode="contain" 
        className="mx-1"
      />
      <Text className="text-xl font-black tracking-tighter uppercase italic text-white">
        Movie<Text className="text-red-600">Boxing</Text>
      </Text>
      <Image 
        source={BoxingGloveR} 
        style={{ width: 30, height: 30 }} 
        resizeMode="contain" 
        className="ml-2"
      />
    </View>
  );
};