import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNotifications } from '../notifications/NotificationContext';
import { NotificationItem } from '../notifications/types';
// ... removed debug imports (token/local test)

const NotificationsScreen: React.FC = () => {
  const { notifications, unreadCount, refresh, loadMore, markOneReadLocal, connectionStatus, reconnect } = useNotifications() as any;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isRead = !!item.readAt;
    const created = new Date(item.createdAt);
    return (
      <TouchableOpacity
        style={[styles.item, !isRead && styles.itemUnread]}
        activeOpacity={0.85}
        onPress={() => markOneReadLocal(item.id)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {!isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.itemMsg}>{item.message}</Text>
        <Text style={styles.itemTime}>{created.toLocaleString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Status: {connectionStatus}  |  Unread: {unreadCount}</Text>
        <TouchableOpacity style={styles.reconnectBtn} onPress={reconnect}>
          <Text style={styles.reconnectText}>Reconnect</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={n => String(n.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} colors={["#5B5BFF"]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { padding: 16 },
  item: { padding: 14, borderRadius: 12, backgroundColor: '#F7F7FF', marginBottom: 12, borderWidth: 1, borderColor: '#ECECFA' },
  itemUnread: { backgroundColor: '#EDEBFF', borderColor: '#D6D3FF' },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#322F70', flex: 1 },
  itemMsg: { marginTop: 6, color: '#444', lineHeight: 18 },
  itemTime: { marginTop: 8, fontSize: 12, color: '#777' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B5BFF', marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 80, color: '#666' },
  statusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: '#F2F2FF' },
  statusText: { flex: 1, fontSize: 12, color: '#555' },
  reconnectBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#8C8CFF', borderRadius: 6 },
  reconnectText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  // debug styles removed
});

export default NotificationsScreen;
