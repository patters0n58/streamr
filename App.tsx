import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';

const BASE_URL = 'http://10.0.2.2:8000';

type ApiVideo = {
  id: number;
  user_id?: number;
  bunny_video_id?: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail_url?: string;
  alt_thumbnails?: string[];
  status: 'pending' | 'processing' | 'ready' | 'failed' | string;
};

type PlayInfo = {
  title: string;
  stream_url: string;
  poster?: string;
};

export default function App() {
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingVideo, setPlayingVideo] = useState<PlayInfo | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  useEffect(() => {
    loadVideos();

    const interval = setInterval(() => {
      loadVideos(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function loadVideos(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const response = await fetch(`${BASE_URL}/api/v1/videos`);

      if (!response.ok) {
        throw new Error('Failed to load videos');
      }

      const data: ApiVideo[] = await response.json();
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function playVideo(video: ApiVideo) {
    if (video.status !== 'ready') {
      return;
    }

    try {
      setPlayerLoading(true);

      const response = await fetch(`${BASE_URL}/api/v1/videos/${video.id}/play`);

      if (!response.ok) {
        throw new Error('Playback URL unavailable');
      }

      const data: PlayInfo = await response.json();
      console.log('PLAY INFO:', data);
      setPlayingVideo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play video');
    } finally {
      setPlayerLoading(false);
    }
  }

  const popularVideos = videos.filter(
    video => String(video.status).trim().toLowerCase() === 'ready',
  );

  const processingVideos = videos.filter(
    video => String(video.status).trim().toLowerCase() !== 'ready',
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Streamr</Text>
          <Pressable onPress={() => loadVideos()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <VideoSection
          title="Popular Videos"
          videos={popularVideos}
          onPressVideo={playVideo}
        />

        <VideoSection
          title="Processing"
          videos={processingVideos}
          onPressVideo={playVideo}
          emptyText="No processing videos."
        />
      </ScrollView>

      <Modal
        visible={!!playingVideo}
        animationType="slide"
        transparent
        onRequestClose={() => setPlayingVideo(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.playerCard}>
            <View style={styles.playerHeader}>
              <Text numberOfLines={1} style={styles.playerTitle}>
                {playingVideo?.title}
              </Text>

              <Pressable onPress={() => setPlayingVideo(null)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            {playingVideo ? (
              <Video
                source={{
                  uri: playingVideo.stream_url,
                  type: 'm3u8',
                }}
                poster={playingVideo.poster}
                posterResizeMode="cover"
                style={styles.videoPlayer}
                controls
                resizeMode="contain"
                paused={false}
                playInBackground={false}
                playWhenInactive={false}
                onLoadStart={() => {
                  console.log('VIDEO LOAD START:', playingVideo.stream_url);
                }}
                onLoad={data => {
                  console.log('VIDEO LOADED:', data);
                }}
                onBuffer={data => {
                  console.log('VIDEO BUFFER:', data);
                }}
                onProgress={data => {
                  console.log('VIDEO PROGRESS:', data.currentTime);
                }}
                onError={videoError => {
                  console.log('VIDEO ERROR FULL:', JSON.stringify(videoError, null, 2));
                  setError('Video playback failed. Check Metro logs.');
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {playerLoading ? (
        <View style={styles.playerLoading}>
          <ActivityIndicator />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function VideoSection({
  title,
  videos,
  onPressVideo,
  emptyText = 'No videos found.',
}: {
  title: string;
  videos: ApiVideo[];
  onPressVideo: (video: ApiVideo) => void;
  emptyText?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>

      {videos.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <FlatList
          horizontal
          data={videos}
          keyExtractor={item => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({item}) => (
            <VideoCard video={item} onPress={() => onPressVideo(item)} />
          )}
        />
      )}
    </View>
  );
}

function VideoCard({
  video,
  onPress,
}: {
  video: ApiVideo;
  onPress: () => void;
}) {
  const category = video.category || 'Video';
  const tags = video.tags?.length ? video.tags.slice(0, 2).join(', ') : 'Streamr';
  const isReady = video.status === 'ready';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumbnailWrap}>
        <Image
          source={{
            uri:
              video.thumbnail_url ||
              'https://via.placeholder.com/400x240?text=No+Thumbnail',
          }}
          style={styles.thumbnail}
        />

        <View style={styles.playBadge}>
          <Text style={styles.playIcon}>{isReady ? '▶' : '…'}</Text>
        </View>

        {!isReady ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{video.status}</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} style={styles.videoTitle}>
        {video.title}
      </Text>

      <View style={styles.metaRow}>
        <Text numberOfLines={1} style={styles.category}>
          {category}
        </Text>
        <Text style={styles.dot}>•</Text>
        <Text numberOfLines={1} style={styles.meta}>
          {tags}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05050A',
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  appTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  refreshText: {
    color: '#FF245E',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  loadingText: {
    color: '#9A9AA3',
    marginTop: 8,
    fontSize: 12,
  },

  errorText: {
    color: '#FF4D6D',
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
  },

  section: {
    marginTop: 12,
  },

  sectionHeader: {
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  seeAll: {
    color: '#FF245E',
    fontSize: 10,
    fontWeight: '800',
  },

  row: {
    paddingLeft: 14,
    paddingRight: 8,
  },

  card: {
    width: 132,
    marginRight: 12,
  },

  thumbnailWrap: {
    width: '100%',
    height: 82,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#15151F',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  playBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  playIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 1,
  },

  statusBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  videoTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 7,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },

  category: {
    color: '#FF245E',
    fontSize: 8,
    fontWeight: '900',
    maxWidth: 54,
  },

  dot: {
    color: '#777',
    fontSize: 8,
    marginHorizontal: 3,
  },

  meta: {
    color: '#9A9AA3',
    fontSize: 8,
    fontWeight: '600',
    maxWidth: 65,
  },

  emptyText: {
    color: '#777986',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  playerCard: {
    backgroundColor: '#101018',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
  },

  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  playerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
    marginRight: 12,
  },

  closeText: {
    color: '#FF245E',
    fontSize: 12,
    fontWeight: '900',
  },

  videoPlayer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    borderRadius: 12,
  },

  playerLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});