import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
    Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome, FontAwesome5,MaterialCommunityIcons, MaterialIcons, Entypo } from '@expo/vector-icons';




const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const BASE_URL = 'https://jqjo.com';
const USER_ID = null;

export default function ReelsScreen() {
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
    const [videoStates, setVideoStates] = useState({});
      const [forceBottomNavUpdate, setForceBottomNavUpdate] = useState(0);
    
    const insets = useSafeAreaInsets(); // Added for dynamic safe area handling
    
    const [muted, setMuted] = useState(false);
    const navigation = useNavigation();
    // Add this to your ReelsScreen component to handle navigation lifecycle
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Reset video states when screen comes into focus
    const newStates = {};
    videos.forEach((video) => {
      newStates[video.video_id] = true;
    });
    setVideoStates(newStates);
  });

  return unsubscribe;
}, [navigation, videos]);

  const flatListRef = useRef(null);
  const videoRefs = useRef({});

  const viewabilityConfig = { itemVisiblePercentThreshold: 70 };

  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    const newStates = {};
    videos.forEach((vid) => {
      newStates[vid.video_id] = true;
      if (videoRefs.current[vid.video_id]) {
        videoRefs.current[vid.video_id].pauseAsync?.();
      }
    });

    if (viewableItems.length > 0) {
      const currentId = viewableItems[0].item.video_id;
      newStates[currentId] = false;
      const currentVideo = videoRefs.current[currentId];
      if (currentVideo) {
        currentVideo.setIsMutedAsync(muted);
        currentVideo.playAsync();
      }
    }

    setVideoStates(newStates);
  });

  const viewabilityPairs = useRef([
    {
      viewabilityConfig,
      onViewableItemsChanged: onViewableItemsChangedRef.current,
    },
  ]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/videos`, {
        params: { page, limit: 10 },
      });

      if (response.data.data) {
        const newData = response.data.data;
        setVideos((prev) => [...prev, ...newData]);

        const newStates = {};
        newData.forEach((video, index) => {
          newStates[video.video_id] = !(index === 0 && page === 1);
        });
        setVideoStates((prev) => ({ ...prev, ...newStates }));

        setTimeout(() => {
          if (page === 1) {
            flatListRef.current?.scrollToIndex({ index: 0, animated: false });
          }
          flatListRef.current?.recordInteraction(); // trigger viewability after load
        }, 500);

        setPage(page + 1);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
      Alert.alert('Error', 'Failed to load videos.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (videoId) => {
    if (!USER_ID) {
      Alert.alert('Login Required', 'Login to like video.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => console.log('Login flow') },
      ]);
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/like-video`,
        `video_id=${videoId}`,
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-User-Id': USER_ID,
          },
        }
      );
      Alert.alert('Liked!');
    } catch (err) {
      Alert.alert('Error liking video.');
    }
  };

  const handleShare = (video) => {
    const url = `${BASE_URL}/reels.php?ref=${video.video_id}`;
    Alert.alert('Share', `Copy this: ${url}`);
  };

  const renderVideo = ({ item }) => {
    const paused = videoStates[item.video_id] ?? true;

    return (
      <View style={styles.videoWrapper}>
        <Video
          ref={(ref) => {
            videoRefs.current[item.video_id] = ref;
          }}
          source={{ uri: item.cloudflare_url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="contain"
          shouldPlay={!paused}
          isLooping
          isMuted={muted}
          useNativeControls={false}
        />

        <View style={styles.videoControls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() =>
              setVideoStates((prev) => ({
                ...prev,
                [item.video_id]: !prev[item.video_id],
              }))
            }
          >
            <Icon name={paused ? 'play' : 'pause'} size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              setMuted((prevMuted) => {
                const newMute = !prevMuted;
                const visibleVideo = Object.keys(videoStates).find(
                  (id) => videoStates[id] === false
                );
                if (visibleVideo && videoRefs.current[visibleVideo]) {
                  videoRefs.current[visibleVideo].setIsMutedAsync(newMute);
                }
                return newMute;
              });
            }}
          >
            <Icon name={muted ? 'volume-off' : 'volume-up'} size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleLike(item.video_id)}
          >
            <Icon name="heart" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleShare(item)}
          >
            <Icon name="share" size={18} color="#fff" />
          </TouchableOpacity>
            </View>
           

            <Text style={styles.videoTitle}>{item.title || 'Untitled News'}</Text>
             {/* Bottom Navigation */}
     <View
  key={`bottom-nav-${forceBottomNavUpdate}`}
  style={[
    styles.bottomNav,
    {
      bottom: Platform.OS === 'android' ? 5 + insets.bottom : insets.bottom,
    },
  ]}
>
  <TouchableOpacity style={styles.readBtn}>
    <Entypo name="book" size={18} color="white" />
    <Text style={styles.bottomText}>Read</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.listenBtn}>
    <MaterialIcons name="headset" size={18} color="black" />
    <Text style={[styles.bottomText, { color: 'black' }]}>Listen</Text>
  </TouchableOpacity>
</View>
        </View>
        
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* <Text style={styles.header}>Shorts</Text> */}
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.video_id.toString()}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={loadVideos}
        onEndReachedThreshold={0.5}
        initialScrollIndex={0}
        waitForInteractions={true}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        viewabilityConfigCallbackPairs={viewabilityPairs.current}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color="#FFD700" /> : null
        }
        scrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: true });
          }, 500);
        }}
          />
           
      </SafeAreaView>
      
    );
    
}

const styles = StyleSheet.create({
    bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
  },
  videoWrapper: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoControls: {
    position: 'absolute',
    right: 15,
    bottom: 150,
    flexDirection: 'column',
    gap: 15,
    alignItems: 'center',
  },
  controlBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    color: '#fff',
    fontSize: 14,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    },
  readBtn: {
    flex: 1,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenBtn: {
    flex: 1,
    backgroundColor: '#FFD500',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
});
