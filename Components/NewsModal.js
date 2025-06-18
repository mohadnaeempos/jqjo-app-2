import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import { ResizeMode } from 'expo-av';

const NewsModal = ({ visible, onClose, articleData }) => {
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

  useEffect(() => {
  console.log('Checking for video in articleData:', articleData?.video);
  if (articleData?.video) {
    console.log('Video URL found:', articleData.video);
    setHasVideo(true);
  } else {
    console.log('No video found in article data');
    setHasVideo(false);
  }
}, [articleData]);
  // Format audio duration for display
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
  // Check if audio exists and has a path
  if (!articleData?.audio?.path) {
    console.log('No valid audio URL provided');
    return;
  }

  try {
    if (sound) {
      if (isAudioPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsAudioPlaying(!isAudioPlaying);
    } else {
      setIsLoadingAudio(true);
      console.log('Loading audio from:', articleData.audio.path);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: articleData.audio.path },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsAudioPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded) {
          const newProgress = (status.positionMillis / status.durationMillis) * 100;
          setProgress(newProgress);
          if (status.didJustFinish) {
            setIsAudioPlaying(false);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error with audio playback:', error);
  } finally {
    setIsLoadingAudio(false);
  }
};

  // Handle video playback
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

  // Clean up audio on unmount
  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  // Reset states when modal closes
  useEffect(() => {
    if (!visible) {
      if (sound) {
        sound.unloadAsync();
        setSound(null);
      }
      setIsAudioPlaying(false);
      setIsVideoPlaying(false);
      setProgress(0);
    }
  }, [visible]);

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
        await sound.setRateAsync(newSpeed, true);
      } catch (error) {
        console.error('Error setting playback speed:', error);
      }
    }
  };

  if (!articleData) return null;

    return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                style={styles.modalScrollView}
              >
                {/* Video or Image container */}
                
{hasVideo ? (
  <View style={styles.videoContainer}>
    <Video
      ref={ref => {
        console.log('Setting video ref');
        setVideoRef(ref);
      }}
      source={{ uri: articleData.video }}
      style={styles.video}
      resizeMode={ResizeMode.CONTAIN}
      useNativeControls={false}
      isLooping={false}
      onError={(error) => {
        console.error('Video error:', error);
        console.log('Error details:', error.nativeEvent);
        setHasVideo(false);
      }}
      onLoadStart={() => console.log('Video loading started')}
      onLoad={() => console.log('Video loaded successfully')}
      onReadyForDisplay={() => console.log('Video ready for display')}
      onPlaybackStatusUpdate={(status) => {
        console.log('Playback status update:', status);
        if (status.isLoaded) {
          console.log('Video duration:', status.durationMillis);
          console.log('Video position:', status.positionMillis);
          console.log('Is playing:', status.isPlaying);
        }
      }}
    />
    <View style={styles.videoControlsContainer}>
      <TouchableOpacity 
        style={styles.videoPlayButton}
        onPress={() => {
          console.log('Play button pressed. Current play state:', isVideoPlaying);
          toggleVideoPlayback();
        }}
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
      onError={() => {
        console.log('Image failed to load');
        setImageError(true);
      }}
    />
  </View>
) : null}
                {/* Title and view counter */}
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

                {/* Audio player - only show if audio exists */}
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

                {/* Autoplay option */}
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

                {/* Article content */}
                <ScrollView style={styles.contentScroll}>
                  <Text style={styles.articleContent}>
                    {articleData.description || 'No content available'}
                  </Text>
                  
                  <Text style={styles.reviewedBy}>
                    Reviewed by JQJO team
                  </Text>
                  
                  {/* Action buttons */}
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
                    
                    <TouchableOpacity style={styles.shareButton}>
                      <Ionicons name="share-social-outline" size={22} color="#444" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Comments section */}
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
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalScrollView: {
    width: '100%',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 20,
    paddingTop: 65,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  autoplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
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
    transform: [{ translateX: 18}],
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
    height: 350,
    marginTop: 0,
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
  playIconContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f8f9fa',
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
});

export default NewsModal;