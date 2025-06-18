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
  Modal,
  Share,
  Pressable,
} from 'react-native';
import { Video } from 'expo-av';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
  const [muted, setMuted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
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
          flatListRef.current?.recordInteraction();
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
    setCurrentVideo(video);
    setShowShareModal(true);
  };

  const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 100);            // Limit length if needed
};

const shareVideo = async () => {
  try {
    const { video_id, slug, title, cloudflare_url, news_url } = currentVideo;

    if (!cloudflare_url) {
      Alert.alert('Error', 'No video file available to share.');
      return;
    }

    const safeTitle = slug || slugify(title || 'video');
    const fileName = `${safeTitle}-${video_id}.mp4`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    // Download the video file only if it doesn't exist
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      const downloadResult = await FileSystem.downloadAsync(cloudflare_url, fileUri);
      if (downloadResult.status !== 200) throw new Error('Failed to download video');
    }

    // Try to share the video file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Share Video',
      });
    } 
  } catch (error) {
    console.error('Error sharing video:', error);
    Alert.alert('Failed to share video. Please try again.');
  } finally {
    setShowShareModal(false);
  }
};



const shareNews = async () => {
  try {
    const { video_id,news_id, title, slug } = currentVideo;

    const safeSlug = slug || slugify(title || 'news');
    const videoLink = `${BASE_URL}/reels.php?ref=${video_id}`;
    const newsLink = `${BASE_URL}/news/en/${safeSlug}/${news_id}`;

    const message = `Check out this news: ${title}\n\nVideo Link: ${videoLink}\n\nNews Link: ${newsLink}`;

    await Share.share({ message });
  } catch (error) {
    console.error('Error sharing news:', error);
  } finally {
    setShowShareModal(false);
  }
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
      {/* Share Modal */}
      <Modal
  visible={showShareModal}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setShowShareModal(false)}
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setShowShareModal(false)}
  >
    <Pressable
      style={styles.shareModal}
      onPress={(e) => e.stopPropagation()} // prevent inner press from closing modal
    >
      <Text style={styles.shareTitle}>Share Options</Text>

      <TouchableOpacity
        onPress={() => setShowShareModal(false)}
        style={styles.closeIconContainer}
      >
        <Icon name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: '#FFD700' }]}
        onPress={shareVideo}
      >
        <Text style={[styles.shareButtonText, { color: '#000' }]}>
          Share Video
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: '#1a1a1a' }]}
        onPress={shareNews}
      >
        <Text style={[styles.shareButtonText, { color: '#fff' }]}>
          Share News
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setShowShareModal(false)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </Pressable>
  </Pressable>
</Modal>


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
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#000',
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
  bottomText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    marginLeft: 5 
  },
  // Share Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)',
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  shareModal: {
    backgroundColor: 'black',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
  },
  shareTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'start',
  },
  shareButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderRadius: 18,
  marginVertical: 8,
  justifyContent: 'center',
},

shareButtonText: {
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 10,
  },
closeIconContainer: {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 10,
  padding: 8,
},




});