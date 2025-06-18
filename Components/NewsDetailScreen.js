import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  AppState,
  BackHandler
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import { ResizeMode } from 'expo-av';
import { Entypo } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const NewsDetailScreen = ({ route }) => {
const { 
    articleData, 
    articles: initialArticles, 
    currentIndex, 
    category, 
    language, 
    keyword, 
    page: initialPage, 
    hasMore: initialHasMore 
  } = route.params;
  const insets = useSafeAreaInsets();
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1x');
  const [progress, setProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [sound, setSound] = useState(null);
  const [videoRef, setVideoRef] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [forceBottomNavUpdate, setForceBottomNavUpdate] = useState(0);
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  const navigation = useNavigation();

  const cleanupAudio = async (soundObject) => {
  if (soundObject) {
    try {
      console.log('Cleaning up audio...');
      const status = await soundObject.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundObject.stopAsync();
        }
        await soundObject.unloadAsync();
      }
      console.log('Audio cleanup completed');
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }
};
  // Load autoplay preference from AsyncStorage
  useEffect(() => {
    const loadAutoplayPreference = async () => {
      try {
        const savedAutoplay = await AsyncStorage.getItem('autoplayNext');
        if (savedAutoplay !== null) {
          setAutoplayNext(JSON.parse(savedAutoplay));
        }
      } catch (error) {
        console.error('Error loading autoplay preference:', error);
      }
    };
    loadAutoplayPreference();
  }, []);

  // Save autoplay preference to AsyncStorage
  useEffect(() => {
    const saveAutoplayPreference = async () => {
      try {
        await AsyncStorage.setItem('autoplayNext', JSON.stringify(autoplayNext));
      } catch (error) {
        console.error('Error saving autoplay preference:', error);
      }
    };
    saveAutoplayPreference();
  }, [autoplayNext]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('NewsDetailScreen: App resumed, forcing bottomNav update', { Platform: Platform.OS });
        setForceBottomNavUpdate((prev) => prev + 1);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (articleData?.video) {
      setHasVideo(true);
    } else {
      setHasVideo(false);
    }
  }, [articleData]);

 const fetchArticles = async (pageNum, append = false) => {
    if (isFetchingMore) return;

    setIsFetchingMore(true);
    const limit = 10; // Match HomeScreen limit
    const baseParams = `page=${pageNum}&limit=${limit}`;
    const slugPart = language ? `&slug=${language}` : '';
    const categoryPart = category ? `&category=${encodeURIComponent(category)}` : '';
    const keywordPart = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';

    try {
      const response = await fetch(
        `https://jqjo.com/api/news?${baseParams}${slugPart}${categoryPart}${keywordPart}`
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const json = await response.json();
      
      if (!json.data || json.data.length === 0) {
        setHasMore(false);
        return [];
      }

      const formattedArticles = await Promise.all(json.data.map(async (article) => {
        let audioDuration = '0:00';
        if (article.audio_metadata?.duration) {
          audioDuration = formatAudioDuration(parseFloat(article.audio_metadata.duration));
        } else if (article.audio_duration) {
          audioDuration = formatAudioDuration(article.audio_duration);
        } else if (article.audio?.path) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: article.audio.path },
              { shouldPlay: false }
            );
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              audioDuration = formatAudioDuration(status.durationMillis / 1000);
            }
            await sound.unloadAsync();
          } catch (error) {
            console.log("Couldn't load audio duration", error);
          }
        }

        return {
          id: article.id,
          title: article.title,
          description: article.description || article.summary || '',
          image: article.image || article.thumbnail || '',
          timeAgo: calculateTimeAgo(article.published_at || article.created_at),
          audioDuration: audioDuration,
          views: article.views || 0,
          likes: article.likes || 0,
          audio: article.audio || null,
          category: article.category || article.category_name 
        };
      }));

      setHasMore(json.data.length >= limit);
      setArticles(prev => append ? [...prev, ...formattedArticles] : formattedArticles);
      return formattedArticles;
    } catch (error) {
      console.error('Error fetching articles:', error);
      setHasMore(false);
      return [];
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Utility function to calculate time ago (copied from HomeScreen)
  const calculateTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';

    try {
      const date = new Date(dateString);
      const pktDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
      const now = new Date();

      const seconds = Math.floor((now - pktDate) / 1000);
      const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
      };

      if (seconds < 60) return 'Just now';

      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const value = Math.floor(seconds / secondsInUnit);
        if (value >= 1) {
          const unitLabel =
            unit === 'minute' ? (value === 1 ? 'minute' : 'minutes') :
            unit === 'hour' ? (value === 1 ? 'hour' : 'hours') :
            unit === 'day' ? (value === 1 ? 'day' : 'days') :
            unit === 'week' ? (value === 1 ? 'week' : 'weeks') :
            unit === 'month' ? (value === 1 ? 'month' : 'months') :
            unit === 'year' ? (value === 1 ? 'year' : 'years') : unit;
          return `${value} ${unitLabel} ago`;
        }
      }
    } catch (error) {
      console.error('Error calculating time ago:', error);
      return 'Just now';
    }
  };

  const formatAudioDuration = (duration) => {
    if (!duration) return '0:00';
    if (typeof duration === 'string') {
      if (duration.includes(':')) return duration;
      return `${Math.floor(parseInt(duration) / 60)}:${parseInt(duration) % 60}`;
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

 const toggleAudioPlayback = async () => {
    if (!articleData?.audio?.path) {
      console.log('No valid audio URL provided');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        const status = await sound.getStatusAsync();
        console.log('Current sound status:', status);

        if (!status.isLoaded) {
          console.log('Sound is not loaded, reloading...');
          await sound.unloadAsync();
          setSound(null);
          setIsAudioPlaying(false);
          setProgress(0);
        } else if (isAudioPlaying) {
          console.log('Pausing audio');
          await sound.pauseAsync();
          setIsAudioPlaying(false);
          return;
        } else {
          console.log('Playing audio');
          await sound.playAsync();
          setIsAudioPlaying(true);
          return;
        }
      }

      setIsLoadingAudio(true);
      console.log('Loading audio from:', articleData.audio.path);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: articleData.audio.path },
        { shouldPlay: true, rate: parseFloat(playbackSpeed) || 1.0, shouldCorrectPitch: true },
        (status) => {
          if (status.isLoaded) {
            const newProgress = status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0;
            setProgress(newProgress);
            if (status.didJustFinish) {
              console.log('Audio finished, resetting states');
              setIsAudioPlaying(false);
              setProgress(0);
              newSound.unloadAsync().then(() => {
                console.log('Sound unloaded after completion');
                setSound(null);
              }).catch((error) => {
                console.error('Error unloading sound after completion:', error);
              });
              if (autoplayNext) {
                console.log('Autoplay enabled, navigating to next article');
                handleNextArticle();
              }
            }
          }
        }
      );

      console.log('New sound loaded');
      setSound(newSound);
      setIsAudioPlaying(true);
    } catch (error) {
      console.error('Error with audio playback:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

const handleNextArticle = async () => {
  console.log('handleNextArticle called');
  
  // Always cleanup current audio first
  if (sound) {
    await cleanupAudio(sound);
    setSound(null);
    setIsAudioPlaying(false);
    setProgress(0);
  }

  if (!autoplayNext) {
    console.log('Autoplay disabled, stopping here');
    return;
  }

  if (currentIndex + 1 < articles.length) {
    // Increment view count for next article
    try {
      const nextArticle = articles[currentIndex + 1];
      const response = await fetch(`https://jqjo.com/api/news-detail?slug=${language}&id=${nextArticle.id}`);
      
      if (response.ok) {
        setArticles(prev => 
          prev.map(item => 
            item.id === nextArticle.id ? { ...item, views: item.views + 1 } : item
          )
        );
      }
    } catch (error) {
      console.error('Error incrementing view count for next article:', error);
    }

    // Navigate to next article
    const nextArticle = articles[currentIndex + 1];
    navigation.replace('NewsDetail', {
      articleData: {
        ...nextArticle,
        views: nextArticle.views + 1
      },
      articles,
      currentIndex: currentIndex + 1,
      category,
      language,
      keyword,
      page,
      hasMore,
      fromAutoplay: true,
    });
  } else if (hasMore) {
    // Fetch next page of articles
    try {
      setIsLoadingAudio(true);
      const newPage = page + 1;
      const newArticles = await fetchArticles(newPage, true);
      
      if (newArticles.length > 0) {
        try {
          const response = await fetch(`https://jqjo.com/api/news-detail?slug=${language}&id=${newArticles[0].id}`);
          
          if (response.ok) {
            newArticles[0].views += 1;
          }
        } catch (error) {
          console.error('Error incrementing view count for new article:', error);
        }

        setPage(newPage);
        navigation.replace('NewsDetail', {
          articleData: {
            ...newArticles[0],
            views: newArticles[0].views + 1
          },
          articles: [...articles, ...newArticles],
          currentIndex: articles.length,
          category,
          language,
          keyword,
          page: newPage,
          hasMore,
          fromAutoplay: true,
        });
      } else {
        console.log('No more articles available');
        setAutoplayNext(false);
        setIsLoadingAudio(false);
      }
    } catch (error) {
      console.error('Error loading more articles for autoplay:', error);
      setAutoplayNext(false);
      setIsLoadingAudio(false);
    }
  } else {
    console.log('No more articles available');
    setAutoplayNext(false);
    setIsLoadingAudio(false);
  }
};

const handleGoBack = async () => {
  console.log('handleGoBack called');
  
  // Cleanup audio first
  if (sound) {
    await cleanupAudio(sound);
    setSound(null);
    setIsAudioPlaying(false);
    setProgress(0);
  }

  console.log('Navigating back to HomeScreen with params', {
    selectedCategory: category,
    selectedLanguage: language,
    searchKeyword: keyword,
    page,
    hasMore,
    updatedArticles: articles,
  });

  navigation.navigate('Home', {
    updatedArticles: articles,
    selectedCategory: category,
    selectedLanguage: language,
    searchKeyword: keyword,
    page,
    hasMore,
  });
};


 useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      console.log('Android back button pressed, calling handleGoBack');
      handleGoBack();
      return true; // Prevent default back behavior
    };

    try {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
    } catch (error) {
      console.error('Error adding BackHandler listener:', error);
    }

    // Cleanup function when screen loses focus
    return () => {
      console.log('Screen losing focus, cleaning up audio');
      if (sound) {
        cleanupAudio(sound).then(() => {
          setSound(null);
          setIsAudioPlaying(false);
          setProgress(0);
        });
      }

      try {
        if (BackHandler.removeEventListener) {
          BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        } else {
          console.warn('BackHandler.removeEventListener is undefined');
        }
      } catch (error) {
        console.error('Error removing BackHandler listener:', error);
      }
    };
  }, [sound, articles, category, language, keyword, page, hasMore])
);

  const toggleVideoPlayback = async () => {
    if (!hasVideo || !videoRef) return;

    try {
      const status = await videoRef.getStatusAsync();
      if (status.isPlaying) {
        await videoRef.pauseAsync();
        setIsVideoPlaying(false);
      } else {
        await videoRef.playAsync();
        setIsVideoPlaying(true);
      }
    } catch (error) {
      console.error('Error with video playback:', error);
    }
  };

useEffect(() => {
  if (autoplayNext && articleData?.audio?.path && !sound && route.params?.fromAutoplay) {
    console.log('Triggering autoplay for article:', articleData.title);
    toggleAudioPlayback();
  }

  // Cleanup function that runs when component unmounts or dependencies change
  return () => {
    if (sound) {
      console.log('Component cleanup: Unloading sound');
      cleanupAudio(sound).then(() => {
        setSound(null);
        setIsAudioPlaying(false);
        setProgress(0);
      });
    }
  };
}, [articleData, autoplayNext, route.params?.fromAutoplay]); // Removed 'sound' from dependencies


  const togglePlaybackSpeed = async () => {
    const speeds = [1.0, 1.5, 2.0];
    const speedLabels = ['1x', '1.5x', '2x'];
    const currentIndex = speedLabels.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    const newSpeedLabel = speedLabels[nextIndex];

    setPlaybackSpeed(newSpeedLabel);

    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setRateAsync(newSpeed, true);
        }
      } catch (error) {
        console.error('Error setting playback speed:', error);
      }
    }
  };

  if (!articleData) return null;

  const handleShare = async () => {
    try {
      const articleUrl = articleData?.url || 'https://jqjo.com';
      if (!articleUrl) {
        console.warn('No article URL provided');
        return;
      }

      const result = await Share.share({
        message: `Check out this article: ${articleData.title}\n${articleUrl}`,
        url: articleUrl,
        title: articleData.title,
      });

      if (result.action === Share.sharedAction) {
        console.log('Article shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share sheet dismissed');
      }
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.leftHeader}>
          <TouchableOpacity 
  onPress={handleGoBack} 
  style={styles.menuWrapper}
>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Image source={require('../assets/jqjo.png')} style={styles.logo} />
          </View>
          <View style={styles.rightHeader}>
            <TouchableOpacity style={styles.loginButtons}>
              <FontAwesome name="google" size={12} color="black" />
              <Text style={styles.loginTexts}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {hasVideo ? (
          <View style={styles.videoContainer}>
            <Video
              ref={ref => setVideoRef(ref)}
              source={{ uri: articleData.video }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls={false}
              isLooping={false}
              onError={(error) => {
                console.error('Video error:', error);
                setHasVideo(false);
              }}
            />
            <View style={styles.videoControlsContainer}>
              <TouchableOpacity 
                style={styles.videoPlayButton}
                onPress={toggleVideoPlayback}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isVideoPlaying ? "pause" : "play"} 
                  size={48}
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : articleData.image && !imageError ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: articleData.image }} 
              style={styles.headerImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </View>
        ) : null}

        {articleData?.category ? (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>
              {String(articleData.category).toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={styles.titleContainer}>
          <Text 
            style={styles.articleTitle}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {articleData.title}
          </Text>
          <View style={styles.viewCounter}>
            <Ionicons name="eye" size={16} color="#333" />
            <Text style={styles.viewCountText}>
              {articleData.views || '0'}
            </Text>
          </View>
        </View>

        {articleData.audio && (
          <View style={{ paddingHorizontal: 0 }}>
            <View style={styles.audioPlayerBar}>
              <TouchableOpacity 
                onPress={toggleAudioPlayback} 
                style={styles.playButtons}
                disabled={isLoadingAudio}
              >
                {isLoadingAudio ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <FontAwesome 
                    name={isAudioPlaying ? "pause" : "play"} 
                    size={24} 
                    color="#000" 
                  />
                )}
              </TouchableOpacity>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>

              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  {formatAudioDuration(articleData.audioDuration)}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={togglePlaybackSpeed} 
                style={styles.speedButton}
                disabled={isLoadingAudio}
              >
                <Text style={styles.speedLabel}>{playbackSpeed}</Text>
                <Ionicons 
                  name="chevron-down" 
                  size={16} 
                  color="#fff" 
                  style={{ marginLeft: 4 }} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.autoplayContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAutoplayNext(!autoplayNext)}
            style={[
              styles.switchTrack,
              autoplayNext && styles.switchTrackOn,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                autoplayNext && styles.switchThumbOn,
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.autoplayLabel}>Autoplay next news</Text>
        </View>

        <ScrollView style={styles.contentScroll}>
          <Text style={styles.articleContent}>
            {articleData.description || 'No content available'}
          </Text>
          
          <Text style={styles.reviewedBy}>
            Reviewed by JQJO team
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.bookmarkButton}>
              <Ionicons name="bookmark-outline" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="heart-outline" size={22} color="red" />
              <Text style={styles.likeText}>
                ({articleData.likes || 0})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color="#444" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments</Text>
            
            <View style={styles.commentLoginPrompt}>
              <Ionicons name="person-circle-outline" size={24} color="#ccc" />
              <View style={styles.loginPromptContainer}>
                <Text style={styles.loginPromptText}>Please login to</Text>
              </View>
              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <View
        key={`bottom-nav-${forceBottomNavUpdate}`}
        style={[
          styles.bottomNav,
          {
            bottom: Platform.OS === 'android' ? 0 + insets.bottom : insets.bottom,
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

const styles = StyleSheet.create({
   container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // New container for proper header positioning
   headerContainer: {
    paddingTop: 15,
    backgroundColor: '#FFD500',
    ...Platform.select({
      android: {
        marginTop: 0, // No margin for Android
      },
      ios: {
        marginTop: 40, // Keep 40 margin for iOS
      }
    }),
  },
  // Header styles (same as HomeScreen)
  header: {
    backgroundColor: '#FFD500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: 0, // Now controlled by headerContainer
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  menuWrapper: {
    height: 24,
    justifyContent: 'center',
    paddingLeft: 5,
  },
  logo: { 
    width: 75,
    height: 25,
    resizeMode: 'contain',
    marginLeft: 5,
  },
  rightHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  loginButtons: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginTexts: { 
    marginLeft: 5, 
    fontSize: 12 
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 70,
  },
  scrollView: {
    width: '100%',
  },
  categoryContainer: {
    backgroundColor: '#dc3545',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
    marginLeft: 15, // Increase to account for container padding
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  autoplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  switchTrack: {
    width: 36,
    height: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    padding: 2,
  },
  switchTrackOn: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
    borderWidth: 1,
  },
  switchThumb: {
    width: 14,
    height: 14,
    borderRadius: 12,
    backgroundColor: '#DDD',
  },
  switchThumbOn: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 18 }],
  },
  autoplayLabel: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    marginTop: 25,
    paddingHorizontal: 16,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  viewCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 60,
    justifyContent: 'center',
  },
  viewCountText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  contentScroll: {
    paddingHorizontal: 16,
  },
  articleContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  reviewedBy: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 24,
  },
  bookmarkButton: {
    backgroundColor: '#3f51b5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  likeText: {
    marginLeft: 5,
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
    marginBottom: 32,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  commentLoginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  loginPromptContainer: {
    flex: 1,
    marginLeft: 10,
    
  },
  loginPromptText: {
    color: '#777',
  },
  loginButton: {
    backgroundColor: '#3f51b5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  audioPlayerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD500',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 18,
    marginHorizontal: 16,
  },
  playButtons: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#A37A00',
  },
  durationContainer: {
    marginRight: 12,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#000',
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 350,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bottomNav: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderColor: '#ccc',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: '#fff',
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
    marginLeft: 5,
  },
});

export default NewsDetailScreen;