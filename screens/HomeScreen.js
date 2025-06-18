import React, { useState, useEffect ,useCallback,useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform ,
  RefreshControl,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome, FontAwesome5,MaterialCommunityIcons, MaterialIcons, Entypo } from '@expo/vector-icons';
import NewsModal from '../Components/NewsModal';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// import * as WebBrowser from 'expo-web-browser';
// import * as Google from 'expo-auth-session/providers/google';
// import { makeRedirectUri } from 'expo-auth-session';

// const redirectUri = makeRedirectUri({
//   scheme: 'jqjo', 
//   useProxy: true 
// });

// const webClientId = '1059823952505-d8ife8ebcivolrte4ns506moj4934v19.apps.googleusercontent.com';
// const iosClientId = '1059823952505-55hb4llqo87bebj96n2doj74rvkqters.apps.googleusercontent.com';
// const androidClientId = '1059823952505-r701pgmsdc6qcij3g7vpfk074a1fup5k.apps.googleusercontent.com';

// WebBrowser.maybeCompleteAuthSession();



// Custom Hamburger Menu Component
const HamburgerMenu = () => (
  <View style={styles.menuContainer}>
    <View style={styles.menuLine} />
    <View style={[styles.menuLine, { marginVertical: 4 }]} />
    <View style={styles.menuLine} />
  </View>
);


const CategoryButton = ({ text, color, icon, iconLib: IconLib = FontAwesome, onPress, isActive }) => {
  const [isPressed, setIsPressed] = React.useState(false);
  return (
    <TouchableOpacity
      style={[styles.categoryBtn, { 
        backgroundColor: isPressed ? '#808080' : (isActive ? '#808080' : color) 
      }]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      activeOpacity={1}
    >
      <View style={styles.categoryContent}>
        {icon && <IconLib name={icon} size={24} color="#fff" />}
        <Text style={styles.categoryText}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};
const OutsidePressHandler = ({ children, onOutsidePress }) => {
  return (
    <TouchableWithoutFeedback onPress={onOutsidePress}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};


const NewsCard = ({ 
  image, 
  title, 
  desc, 
  timeAgo = 'Just now',
  audioDuration = '0:00',
  views = 0,
  likes = 0  
}) => {
  // Add state to track if duration is loaded
  const [duration, setDuration] = useState(audioDuration);
  
  // Update duration when prop changes
  useEffect(() => {
    if (audioDuration && audioDuration !== '0:00') {
      setDuration(audioDuration);
    }
  }, [audioDuration]);

  return (
    <View style={styles.card}>
      <View style={styles.innerContainer}>
        <Image source={image} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={3}>{title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time" size={15} color="#555" style={styles.metaIcon1} />
            <Text style={styles.metaText}>{timeAgo}</Text>
            <Ionicons name="eye" size={15} color="#555" style={styles.metaIcon} />
            <Text style={styles.metaText}>{views}</Text>
            <Ionicons name="heart" size={15} color="#555" style={styles.metaIcon} />
            <Text style={styles.metaText}>{likes}</Text>
          </View>
          <Text style={styles.description} numberOfLines={3}>{desc}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.listenButton}>
              <Ionicons name="headset-outline" size={15} color="#000" />
              <Text style={styles.listenText}>{duration}</Text>
            </TouchableOpacity>
         <View style={[styles.buttonSpacer, { width: 10 }]} /> 
            <TouchableOpacity style={styles.bookmarkButton}>
              <Ionicons name="bookmark-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
// Utility function to calculate time ago
const calculateTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';

  try {
    const date = new Date(dateString);
    // Assume server time is UTC, add 5 hours (5 * 60 * 60 * 1000 ms) for PKT
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
// Utility function for debouncing
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};
export default function HomeScreen({  route }) {
  const [pressedIcons, setPressedIcons] = useState({
    instagram: false,
    linkedin: false,
    facebook: false,
    youtube: false,
    twitter: false,
    tiktok: false,
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
   const [activeCategoryButton, setActiveCategoryButton] = useState(null);
const [selectedLanguage, setSelectedLanguage] = useState({ 
  slug: 'en', 
  name: 'English', 
  flag: '🇬🇧',
  loading: true 
});
  const [languages, setLanguages] = useState([]);
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

   const [selectedArticle, setSelectedArticle] = useState(null);
   const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
const searchInputRef = useRef(null);
const [appState, setAppState] = useState(AppState.currentState);
const insets = useSafeAreaInsets(); // Added for dynamic safe area handling
  const [forceBottomNavUpdate, setForceBottomNavUpdate] = useState(0);
    const [searchKeyword, setSearchKeyword] = useState('');
// const [request, response, promptAsync] = Google.useAuthRequest({
//   clientId: webClientId,
//   iosClientId: iosClientId,
//   androidClientId: androidClientId,
//   redirectUri: redirectUri, // Custom scheme URI
//    useProxy: true,
// });

// const handleToken = () => {
// if(response?.type === "success") {
//   const { authentication } = response;
//   const token = authentication?.accessToken;
//   console.log("access Token",token)
//   // Use the id_token as needed
// }
// }

// useEffect(() => {
//   handleToken();
// }, [response]);

   const navigation = useNavigation();
  const handleOutsidePress = () => {
    setActiveCategoryButton(null);
  };

const handleCategoryButtonPress = (category) => {
  setActiveCategoryButton(category);
  
  if (category === 'Bookmarks') {
    fetchBookmarks();
  } else {
    // Map "Top Stories" to "trending"
    let apiCategory = category === 'General' ? 'general' : 
                     category === 'Top Stories' ? 'trending' : 
                     category.toLowerCase();
    
    // Clear any active search when selecting category
    setSearchText('');
    setSearchKeyword('');
    
    setSelectedCategory(apiCategory);
    setPage(1);
    setHasMore(true);
  }
};
const fetchBookmarks = async () => {
  setLoading(true);
  try {
    // Implement your bookmark fetching logic here
    // For example, from AsyncStorage or a different API endpoint
    const bookmarkedArticles = await getBookmarkedArticles(); // Your function to get bookmarks
    setArticles(bookmarkedArticles);
    setHasMore(false);
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
  } finally {
    setLoading(false);
  }
};

  const categories = [
    "Politics", "Business", "Economy", "Technology", "International",
    "Environment", "Science", "Sports", "Health", "Education",
    "Entertainment", "Lifestyle", "Culture", "Crime & Law",
    "Travel & Tourism", "Food & Recipes", "Fact Check", "Religion"
  ];


  // Fetch list of languages
 useEffect(() => {
 const fetchLanguages = async () => {
  setLoadingLanguages(true);
  try {
    const response = await fetch('https://jqjo.com/api/languages');
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    const languagesData = data.languages || [];
    
    const formattedLanguages = languagesData.map(lang => ({
      id: lang.slug,
      name: lang.name || 'Unknown',
      slug: lang.slug || 'en',
      flagUrl: lang.flag ? `https://jqjo.com/${lang.flag}` : null
    }));
    
    setLanguages(formattedLanguages);
    
    // Update selectedLanguage if needed
    if (!selectedLanguage.slug || !formattedLanguages.some(l => l.slug === selectedLanguage.slug)) {
      const defaultLang = formattedLanguages.find(l => l.slug === 'en') || formattedLanguages[0];
      if (defaultLang) {
        setSelectedLanguage({
          ...defaultLang,
          flag: defaultLang.flagUrl ? { uri: defaultLang.flagUrl } : '🇬🇧'
        });
      }
    }
  } catch (error) {
    console.error("Error fetching languages:", error);
    // Fallback to basic languages
    setLanguages([
      { id: 'en', name: 'English', slug: 'en', flagUrl: null },
      { id: 'es', name: 'Spanish', slug: 'es', flagUrl: null },
      { id: 'fr', name: 'French', slug: 'fr', flagUrl: null }
    ]);
  } finally {
    setLoadingLanguages(false);
  }
};

  fetchLanguages();
}, []);



  // Fetch articles when filters or page change
const fetchArticles = useCallback(async (pageNum = page, keyword = searchKeyword) => {
  if (loading || (isLoadingMore && !isRefreshing)) return;
  
  setLoading(true);
   const baseParams = `page=${pageNum}&limit=${limit}`;
  const slugPart = selectedLanguage?.slug ? `&slug=${selectedLanguage.slug}` : '';
  const categoryPart = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : '';
  const keywordPart = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';

  try {
    const response = await fetch(
      `https://jqjo.com/api/news?page=${pageNum}&limit=${limit}${slugPart}${categoryPart}${keywordPart}`
    );
    
    const json = await response.json();
    
    if (!json.data || json.data.length === 0) {
      setHasMore(false);
      return;
    }

    // Process articles with Promise.all to ensure all audio durations are loaded
    const formattedArticles = await Promise.all(json.data.map(async (article) => {
      let audioDuration = '0:00';
      
      // Try to get duration from different possible sources
      if (article.audio_metadata?.duration) {
        const duration = parseFloat(article.audio_metadata.duration);
        audioDuration = formatAudioDuration(duration);
      } else if (article.audio_duration) {
        audioDuration = formatAudioDuration(article.audio_duration);
      } else if (article.audio?.path && !isRefreshing) {
        // If needed, load the audio file to get its duration
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
    setArticles(prev => pageNum === 1 ? formattedArticles : [...prev, ...formattedArticles]);
    return formattedArticles;
  } catch (error) {
    console.error("Error fetching articles:", error);
    setHasMore(false);
  } finally {
    setLoading(false);
    setRefreshing(false); 
    setIsRefreshing(false);
  }
}, [page, selectedCategory, selectedLanguage, isLoadingMore, isRefreshing, searchKeyword]);
useEffect(() => {
    const params = route.params || {};
    if (!params.updatedArticles) {
      console.log('Fetching articles on mount or filter change', {
        selectedCategory,
        searchKeyword,
        page,
        language: selectedLanguage?.slug,
      });
      fetchArticles();
    } else {
      console.log('Skipping fetchArticles due to restored state');
    }
  }, [fetchArticles]);
// Save filters to AsyncStorage

useEffect(() => {
  const saveFilters = async () => {
    try {
      console.log('Saving filters to AsyncStorage', { selectedCategory, searchKeyword, page, hasMore });
      await AsyncStorage.setItem('filters', JSON.stringify({
        selectedCategory,
        searchKeyword,
        page,
        hasMore,
      }));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };
  saveFilters();
}, [selectedCategory, searchKeyword, page, hasMore]);

// Load filters on mount
useEffect(() => {
  const loadFilters = async () => {
    try {
      const savedFilters = await AsyncStorage.getItem('filters');
      if (savedFilters) {
        const { selectedCategory, searchKeyword, page, hasMore } = JSON.parse(savedFilters);
        console.log('Loaded filters from AsyncStorage', { selectedCategory, searchKeyword, page, hasMore });
        if (selectedCategory) {
          setSelectedCategory(selectedCategory);
          setActiveCategoryButton(
            selectedCategory === 'general'
              ? 'General'
              : selectedCategory === 'trending'
              ? 'Top Stories'
              : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
          );
        }
        if (searchKeyword) {
          setSearchKeyword(searchKeyword);
          setSearchText(searchKeyword);
        }
        if (page) setPage(page);
        if (hasMore !== undefined) setHasMore(hasMore);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };
  loadFilters();
}, []);
    const handleSearch = debounce((text) => {
    setSearchKeyword(text);
    setPage(1);
    setHasMore(true);
    fetchArticles(1, text);
  }, 500);

 const handleSearchChange = (text) => {
  setSearchText(text);
  
  // If search text is being entered, clear category filter
  if (text) {
    setSelectedCategory('');
    setActiveCategoryButton(null);
  }
  
  handleSearch(text);
};
const handleClearSearch = () => {
  setSearchText('');
  setSearchKeyword('');
  setPage(1);
  fetchArticles(1, '');
};
const formatAudioDuration = (duration) => {
  if (!duration) return '0:00';
  
  // If duration is in seconds (number or string)
  if (typeof duration === 'number' || !isNaN(duration)) {
    const seconds = typeof duration === 'string' ? parseFloat(duration) : duration;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  // If duration is already in MM:SS format
  if (typeof duration === 'string' && duration.includes(':')) {
    return duration;
  }
  
  return '0:00'; // Fallback
};
const handleLoadMore = useCallback(() => {
  if (!loading && !isLoadingMore && hasMore && articles.length > 0) {
    setIsLoadingMore(true);
    setPage(prev => {
      const newPage = prev + 1;
      fetchArticles(newPage); // Fetch articles for the new page
      return newPage;
    });
    // Reset loading state after a short delay
    setTimeout(() => setIsLoadingMore(false), 1000);
  }
}, [loading, hasMore, articles.length, isLoadingMore, fetchArticles]);

  const onRefresh = useCallback(() => {
    setSearchText('');
    setSearchKeyword('');
    setRefreshing(true);
    setIsRefreshing(true);
    setPage(1);
    setArticles([]);
    setHasMore(true);
  }, []);

 const handleCategorySelect = (category) => {
  setSelectedCategory(category);
  setSearchText('');  // Clear search text
  setSearchKeyword(''); // Clear search keyword
  setPage(1);
  setHasMore(true);
};


const handleLanguageSelect = async (language) => {
  const newLanguage = {
    ...language,
    flag: language.flagUrl ? { uri: language.flagUrl } : '🏳️'
  };
  
  setSelectedLanguage(newLanguage);
  setShowLanguageDropdown(false);
  setPage(1);
  setArticles([]);
  setHasMore(true);
  
  // Save to local storage
  try {
    await AsyncStorage.setItem('selectedLanguage', JSON.stringify({
      slug: language.slug,
      name: language.name,
      flagUrl: language.flagUrl
    }));
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

useEffect(() => {
  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        const parsedLanguage = JSON.parse(savedLanguage);
        // Find the matching language from your languages array
        const matchedLanguage = languages.find(lang => lang.slug === parsedLanguage.slug);
        if (matchedLanguage) {
          setSelectedLanguage({
            ...matchedLanguage,
            flag: matchedLanguage.flagUrl ? { uri: matchedLanguage.flagUrl } : '🏳️'
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  loadSavedLanguage();
}, [languages]); // Add languages as a dependency


useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const {
        updatedArticles,
        selectedCategory: returnedCategory,
        selectedLanguage: returnedLanguage,
        searchKeyword: returnedKeyword,
        page: returnedPage,
        hasMore: returnedHasMore,
      } = route.params || {};

      console.log('HomeScreen focus: Restoring params', {
        updatedArticles: !!updatedArticles,
        returnedCategory,
        returnedLanguage,
        returnedKeyword,
        returnedPage,
        returnedHasMore,
      });

      if (updatedArticles) {
        setArticles(updatedArticles);
      }
      if (returnedCategory) {
        setSelectedCategory(returnedCategory);
        setActiveCategoryButton(
          returnedCategory === 'general'
            ? 'General'
            : returnedCategory === 'trending'
            ? 'Top Stories'
            : returnedCategory.charAt(0).toUpperCase() + returnedCategory.slice(1)
        );
      }
      if (returnedLanguage) {
        const lang = languages.find(l => l.slug === returnedLanguage) || {
          slug: returnedLanguage,
          name: 'English',
          flag: '🇬🇧',
        };
        setSelectedLanguage({ slug: lang.slug, name: lang.name, flag: lang.flagUrl || '🇬🇧' });
      }
      if (returnedKeyword !== undefined) {
        setSearchKeyword(returnedKeyword);
        setSearchText(returnedKeyword);
      }
      if (returnedPage) {
        setPage(returnedPage);
      }
      if (returnedHasMore !== undefined) {
        setHasMore(returnedHasMore);
      }

      // Clear params to prevent reprocessing
      navigation.setParams({
        updatedArticles: undefined,
        selectedCategory: undefined,
        selectedLanguage: undefined,
        searchKeyword: undefined,
        page: undefined,
        hasMore: undefined,
      });
    });

    return unsubscribe;
  }, [navigation, languages, route]);

  // const handleNewsCardPress = (article) => {
  //   setSelectedArticle(article);
  //   setIsModalVisible(true);
  // };
const handleNewsCardPress = async (article, index) => {
  try {
    const response = await fetch(`https://jqjo.com/api/news-detail?slug=${selectedLanguage.slug}&id=${article.id}`);
    if (!response.ok) throw new Error('Failed to increment view count');

    const updatedArticles = articles.map(item =>
      item.id === article.id ? { ...item, views: item.views + 1 } : item
    );
    setArticles(updatedArticles);

    console.log('Navigating to NewsDetail with params', { category: selectedCategory, language: selectedLanguage.slug, keyword: searchKeyword, page, hasMore });
    navigation.navigate('NewsDetail', {
      articleData: {
        ...article,
        views: article.views + 1,
      },
      articles: updatedArticles,
      currentIndex: index,
      category: selectedCategory,
      language: selectedLanguage.slug,
      keyword: searchKeyword,
      page,
      hasMore,
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    navigation.navigate('NewsDetail', {
      articleData: {
        ...article,
        category: selectedCategory || 'General',
      },
      articles,
      currentIndex: index,
      category: selectedCategory,
      language: selectedLanguage.slug,
      keyword: searchKeyword,
      page,
      hasMore,
    });
  }
};
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedArticle(null);
  };
  const handlePressIn = (iconName) => setPressedIcons(prev => ({ ...prev, [iconName]: true }));
  const handlePressOut = (iconName) => setPressedIcons(prev => ({ ...prev, [iconName]: false }));

useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('AppState changed to:', nextAppState, 'Platform:', Platform.OS);
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // Force re-render of bottomNav to ensure correct positioning
        setForceBottomNavUpdate((prev => prev + 1));
        console.log('App resumed, forcing bottomNav update');
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [appState]);

  return (
<SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
  <StatusBar backgroundColor="#FFD500" barStyle="dark-content" />
  <OutsidePressHandler onOutsidePress={handleOutsidePress}>
<ScrollView 
  contentContainerStyle={styles.scrollContainer} 
  showsVerticalScrollIndicator={false}
  onScroll={({nativeEvent}) => {
    const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
    const paddingToBottom = Platform.OS === 'android' ? 100 : 50;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
                          contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      handleLoadMore();
    }
  }}
  scrollEventThrottle={16} // More frequent checks on both platforms
  refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000" // Color of the refresh indicator (iOS)
              colors={['#FFD500']} // Color for Android
            />
          }
>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <TouchableOpacity style={styles.menuWrapper} onPress={() => setIsSidebarVisible(true)}>
              <HamburgerMenu />
            </TouchableOpacity>
            <Image source={require('../assets/jqjo.png')} style={styles.logo} />
          </View>
          <View style={styles.rightHeader}>
            <TouchableOpacity style={styles.loginButton}>
              <FontAwesome name="google" size={12} color="black" />
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Icons
        <View style={styles.socialIcons}>
          {Object.keys(pressedIcons).map(iconName => {
            const IconComponent = iconName === 'tiktok' ? FontAwesome5
              : iconName === 'instagram' ? FontAwesome
              : iconName === 'linkedin' ? FontAwesome
              : iconName === 'facebook' ? FontAwesome
              : iconName === 'youtube' ? FontAwesome
              : null;
            const iconProps = {
              instagram: ['instagram', 16],
              linkedin: ['linkedin', 16],
              facebook: ['facebook', 16],
              youtube: ['youtube-play', 16],
              twitter: ['x', 16],
              tiktok: ['tiktok', 16],
            }[iconName];
            return (
              <TouchableOpacity
                key={iconName}
                style={[styles.socialButton, pressedIcons[iconName] && styles.socialButtonPressed]}
                onPressIn={() => handlePressIn(iconName)}
                onPressOut={() => handlePressOut(iconName)}
              >
                {iconName === 'twitter' ? (
                  <Text style={styles.xIcon}>𝕏</Text>
                ) : (
                  <IconComponent name={iconProps[0]} size={iconProps[1]} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </View> */}

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        <CategoryButton 
    text="General" 
    color="#dc3545" 
    icon="home" 
    onPress={() => handleCategoryButtonPress('General')}
    isActive={activeCategoryButton === 'General'}
  />
        <CategoryButton 
          text="Nation" 
          color="#0dcaf0" 
          icon="flag" 
          onPress={() => handleCategoryButtonPress('Nation')}
          isActive={activeCategoryButton === 'Nation'}
        />
        <CategoryButton 
          text="World" 
          color="#212529" 
          icon="globe" 
          onPress={() => handleCategoryButtonPress('World')}
          isActive={activeCategoryButton === 'World'}
        />
        <CategoryButton 
          text="Top Stories" 
          color="#FF5722" 
          iconLib={MaterialIcons} 
          icon="whatshot" 
          onPress={() => handleCategoryButtonPress('Top Stories')}
          isActive={activeCategoryButton === 'Top Stories'}
        />
        <CategoryButton 
          text="Bookmarks" 
          color="#3f51b5" 
          icon="bookmark" 
          onPress={() => handleCategoryButtonPress('Bookmarks')}
          isActive={activeCategoryButton === 'Bookmarks'}
        />
      </ScrollView>

        {/* Latest News Heading */}
        <View style={styles.latestNewsHeading}>
          <Text style={styles.latestNewsText}>Latest News</Text>
        </View>

{/* Search / Filters */}
<TouchableOpacity
  style={styles.searchContainer}
  onPressIn={(e) => {
    // Check if the tap is within the categoryBox
    const isCategoryTap = e.nativeEvent.locationX < 100; // Adjust threshold based on categoryBox width
    if (isCategoryTap) {
      setShowCategoryDropdown(!showCategoryDropdown);
    } else {
      searchInputRef.current?.focus();
    }
  }}
  activeOpacity={0.7}
  accessible={true}
  accessibilityLabel="Search news"
>
  <View style={styles.categoryBox}>
    <Text style={styles.categoryTexts}>{selectedCategory || 'Category'}</Text>
  </View>
  <View style={styles.separatorLine} />
  <View style={styles.searchBox}>
    <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
       <TextInput
        ref={searchInputRef}
        placeholder="Search news..."
        placeholderTextColor="#999"
        style={styles.searchInput}
        value={searchText}
        onChangeText={handleSearchChange}
        returnKeyType="search"
        onSubmitEditing={() => {
          setPage(1);
          fetchArticles(1, searchText);
        }}
      />
      
  </View>
  {showCategoryDropdown && (
    Platform.OS === 'android' ? (
      <Modal
        transparent={true}
        visible={showCategoryDropdown}
        onRequestClose={() => setShowCategoryDropdown(false)}
        animationType="none"
      >
        {/* Touchable overlay */}
        <TouchableWithoutFeedback onPress={() => setShowCategoryDropdown(false)}>
          <View style={styles.androidOverlay} />
        </TouchableWithoutFeedback>

        {/* Dropdown positioned exactly below category box */}
        <View style={styles.androidDropdownPositioner}>
          <View style={styles.androidDropdownContainer}>
            <ScrollView 
              style={styles.androidDropdownScroll}
              contentContainerStyle={styles.androidDropdownContent}
            >
              {categories.map((cat, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[
                    styles.dropdownItem,
                    selectedCategory === cat && styles.selectedDropdownItem
                  ]} 
                  onPress={() => {
                    handleCategorySelect(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    ) : (
      <View style={styles.dropdownContainer}>
        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
          {categories.map((cat, i) => (
            <TouchableOpacity 
              key={i} 
              style={[
                styles.dropdownItem,
                selectedCategory === cat && styles.selectedDropdownItem
              ]} 
              onPress={() => handleCategorySelect(cat)}
            >
              <Text style={styles.dropdownItemText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  )}
</TouchableOpacity>

       {/* News List */}
<View style={styles.newsListContainer}>
  {loading && page === 1 ? (
    <View style={styles.loadMoreBtn}>
    <View style={styles.loadingContent}>
      <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
      <Text style={styles.loadMoreText}>Loading...</Text>
    </View>
  </View>
  ) : (
    <>
      {articles.map((article, index) => (
      <TouchableOpacity 
        key={article.id} 
        activeOpacity={0.9} 
        onPress={() => handleNewsCardPress(article, index)}
      >
        <NewsCard
          image={{ uri: article.image }}
          title={article.title}
          desc={article.description}
          timeAgo={article.timeAgo}
          audioDuration={article.audioDuration}
          views={article.views}
          likes={article.likes}
        />
      </TouchableOpacity>
    ))}
      
{loading ? (
  <View style={styles.loadMoreBtn}>
    <View style={styles.loadingContent}>
      <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
      <Text style={styles.loadMoreText}>Loading...</Text>
    </View>
  </View>
) : hasMore && articles.length > 0 ? (
  <TouchableOpacity 
    style={styles.loadMoreBtn} 
    onPress={handleLoadMore}
    disabled={loading}
  >
    <Text style={styles.loadMoreText}>Load More</Text>
  </TouchableOpacity>
) : null}
    </>
  )}
</View>
      </ScrollView>
 </OutsidePressHandler>
      {/* Bottom Navigation */}
     <View
            key={`bottom-nav-${forceBottomNavUpdate}`} // Force re-render on app state change
            style={[
              styles.bottomNav,
              {
                bottom: Platform.OS === 'android' ? 5 + insets.bottom : insets.bottom, // Combine 10px offset with safe area insets
              },
            ]}
          >
        <TouchableOpacity
  style={styles.readBtn}
  onPress={() => navigation.navigate('Reels')}
>
   <MaterialCommunityIcons name="movie-open-play" size={18} color="white" />
  <Text style={styles.bottomText}>Reels</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.listenBtn}>
          <MaterialIcons name="headset" size={18} color="black" />
          <Text style={[styles.bottomText, { color: 'black' }]}>Listen</Text>
        </TouchableOpacity>
      </View>

      {/* News Modal */}
 <NewsModal 
  visible={isModalVisible} 
  onClose={handleCloseModal} 
  articleData={selectedArticle ? {
    ...selectedArticle,
    audioDuration: selectedArticle.audio?.duration || '0:00'
  } : null} 
/>

      {/* Sidebar */}
      {isSidebarVisible && (
        <TouchableWithoutFeedback onPress={() => setIsSidebarVisible(false)}>
          <View style={styles.sidebarOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sidebar}>
                <View style={styles.sidebarTopSpace} />
                <Image source={require('../assets/jqjo.png')} style={styles.sidebarLogo} />

                <View style={styles.sidebarContent}>
                 <TouchableOpacity
  style={styles.sidebarLanguageButton}
  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
>
  <View style={styles.languageButtonContent}>
    <View style={styles.flagContainer}>
      {typeof selectedLanguage.flag === 'string' ? (
        <Text style={styles.flagEmoji}>{selectedLanguage.flag}</Text>
      ) : (
        <Image source={selectedLanguage.flag} style={styles.flagImage} />
      )}
    </View>
    <Text style={styles.sidebarLanguageText}>{selectedLanguage.name}</Text>
    <MaterialIcons
      name={showLanguageDropdown ? 'arrow-drop-up' : 'arrow-drop-down'}
      size={20}
      color="#fff"
    />
  </View>
</TouchableOpacity>

      {showLanguageDropdown && (
  <View style={styles.languageDropdown}>
    {loadingLanguages ? (
      <ActivityIndicator size="small" color="#000" />
    ) : languages.length > 0 ? (
      <ScrollView style={{ maxHeight: 200 }}>
        {languages.map(lang => (
          <TouchableOpacity
            key={lang.slug}
            style={[
              styles.languageOption,
              lang.slug === selectedLanguage.slug && styles.selectedLanguageOption,
            ]}
            onPress={() => handleLanguageSelect(lang)}
          >
            <View style={styles.languageOptionContent}>
              <View style={styles.flagContainer}>
                {lang.flagUrl ? (
                  <Image source={{ uri: lang.flagUrl }} style={styles.flagImage} />
                ) : (
                  <Text style={styles.flagEmoji}>🏳️</Text>
                )}
              </View>
              <Text style={styles.languageOptionText}>{lang.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    ) : (
      <Text style={styles.dropdownItemText}>No languages available</Text>
    )}
  </View>
)}

                 <TouchableOpacity onPress={() => Linking.openURL('https://jqjo.com/privacy-policy.php')}>
              <Text style={styles.sidebarItem}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://jqjo.com/terms.php')}>
              <Text style={styles.sidebarItem}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://jqjo.com/about.php')}>
              <Text style={styles.sidebarItem}>About Us</Text>
                  </TouchableOpacity>
                  
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContainer: {
    paddingBottom: 70, // Add padding for bottom navigation
  },
  header: {
    backgroundColor: '#FFD500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  menuContainer: {
    justifyContent: 'center',
    marginRight: 5,
    marginTop: -3,
  },
  menuWrapper: {
    height: 24,
    justifyContent: 'center',
    paddingLeft: 5,   
  },
  menuLine: {
    width: 20,
    height: 3,
    backgroundColor: 'black',
    borderRadius: 2,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: { 
    width: 75,
    height: 25,
    resizeMode: 'contain',
    marginLeft: 5,
  },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  loginButton: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: { marginLeft: 5, fontSize: 12 },
  categories: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingVertical:30,
    marginTop:10
  },
  categoryBtn: {
    width: 110,
    height: 75,
    borderRadius: 8,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  categoryText: { 
    color: '#fff',  
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  latestNewsHeading: {
    paddingHorizontal: 15,
    paddingTop: 0,
    paddingBottom: 10,
    marginTop: -10,
  },
  latestNewsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: 25,
    gap: 8,
  },
  socialButton: {
    backgroundColor: '#000',
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonPressed: {
    backgroundColor: '#FFD500',
  },
  xIcon: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
 androidOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.2)',
},
androidDropdownPositioner: {
  position: 'absolute',
  top: 300, // Adjusted to appear below category box
  left: 16,  // Same left position as category box
  width: '40%', // Same width as category box
  zIndex: 1000,
},
androidDropdownContainer: {
  backgroundColor: '#343a40',
  borderRadius: 5,
  maxHeight: 200,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
},
androidDropdownScroll: {
  maxHeight: 200,
},
androidDropdownContent: {
  paddingVertical: 5,
},

 dropdownContainer: {
  position: 'absolute',
  top: 50,
  left: 0,
  width: '40%',
  backgroundColor: '#343a40',
  borderRadius: 5,
  maxHeight: 200,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  zIndex: 1000,
},
dropdownScroll: {
  maxHeight: 200,
  overScrollMode: 'always',
},
dropdownItem: {
  padding: 12,
},
selectedDropdownItem: {
  backgroundColor: '#495057',
},
dropdownItemText: {
  color: '#fff',
  fontSize: 12,
},
  categoryBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  categoryTexts: {
    fontSize: 14,
    color: '#333',
  },
  separatorLine: {
    width: 1,
    height: 24,
    backgroundColor: '#ccc',
    marginHorizontal: -0.5,
    transform: [{ scaleY: 0.6 }],
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  searchBox: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  newsListContainer: {
    padding: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 8,
    marginHorizontal: 8,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  innerContainer: {
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#444',
    marginBottom: 20,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 3,
  },
  metaIcon: {
    marginLeft: 14,
    marginRight:3,
  },
   metaIcon1: {
    marginRight:3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
   listenButton: {
    backgroundColor: '#FFD400',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    width: 90,
    height: 32,
    justifyContent: 'center',
  },
 bookmarkButton: {
    backgroundColor: '#3f51b5',
    width: 32, // Fixed width for circular button
    height: 32, // Match listenButton height
    borderRadius: 16, // Half of width/height for circle
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0, // Remove extra padding
  },
  buttonSpacer: {
    width: 30, // Will be overridden inline to 10
  },
  listenText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
    bookmarkText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#fff',
    ...Platform.select({
      android: {
        marginTop: -2, // Slight upward adjustment
      },
      ios: {
         marginLeft: 5,
    fontSize: 14,
    color: '#fff',
      }
    }),
  },
bottomNav: {
  flexDirection: 'row',
  height: 60,
  borderTopWidth: 1,
  borderColor: '#ccc',
  position: 'absolute',
  bottom: Platform.OS === 'android' ? 10 : 0, // Add 10px space for Android
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
  bottomText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  sidebar: {
    width: 220,
    backgroundColor: '#f8f9fa',
    height: '100%',
    padding: 16,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarTopSpace: {
    height: 30,
  },
  sidebarLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  sidebarItem: {
    fontSize: 14,
    marginVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  sidebarContent: {
    marginTop: 20,
  },
  languageSelectorContainer: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 2,
  },
  sidebarLanguageButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 5,
    width: '100%',
    marginBottom: 10,
  },
  languageButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarLanguageText: {
    color: '#fff',
    fontSize: 14,
  },
 languageDropdown: {
  position: 'absolute',
  top: 50,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#ddd',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  maxHeight: 200, // Add this
  zIndex: 100, // Ensure it appears above other elements
},
  languageOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedLanguageOption: {
    backgroundColor: '#f5f5f5',
  },

  languageOptionContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
languageOptionText: {
  fontSize: 14,
  marginLeft: 10, 
},
    loadMoreBtn: {
    padding: 12,
    alignSelf: 'center',
    backgroundColor: '#FFD500',
    borderRadius: 8,
    marginVertical: 20,
  },
  loadMoreText: {
    fontWeight: 'bold',
    color: '#000',
  },
  loadingButton: {
  padding: 12,
  alignSelf: 'center',
  backgroundColor: '#FFD500',
  borderRadius: 8,
  marginVertical: 20,
  width: 120,
  alignItems: 'center',
},
loadingText: {
  fontWeight: 'bold',
  color: '#000',
},
loadingContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
  flagContainer: {
    width: 20,
    height: 20,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
flagImage: {
  width: 18,
  height: 18,
  resizeMode: 'contain'
},
flagEmoji: {
  fontSize: 20
},

});