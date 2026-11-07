import React, { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function SupportScreen() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const tickets = useAsyncData(() => driverService.supportIssues(), [])

  const submit = useCallback(async () => {
    if (subject.trim().length < 3 || description.trim().length < 10) {
      Alert.alert('Incomplete', 'Add a subject and a detailed description (10+ characters).')
      return
    }
    setLoading(true)
    try {
      const res = await driverService.supportIssue(subject.trim(), description.trim())
      Alert.alert('Ticket created', `Status: ${res.issue.status}`)
      setSubject('')
      setDescription('')
      tickets.refresh()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not submit')
    } finally {
      setLoading(false)
    }
  }, [subject, description, tickets])

  const items = tickets.data?.items ?? []

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <ScrollView
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={tickets.loading} onRefresh={tickets.refresh} />}
      >
        <Text style={styles.h1}>Support</Text>
        <Text style={styles.sub}>Need help? Raise a ticket for device, payment, or account issues.</Text>
        <Input label="Subject" value={subject} onChangeText={setSubject} />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Button label="Raise a Ticket" variant="secondary" onPress={submit} loading={loading} />

        <Text style={styles.section}>Ticket history</Text>
        {items.length === 0 ? (
          <EmptyState title="No tickets yet" message="Your support requests will appear here." />
        ) : (
          items.map((t) => (
            <Card key={t.id}>
              <View style={styles.row}>
                <Text style={styles.ticketSubject}>{t.subject}</Text>
                <Text style={styles.status}>{t.status}</Text>
              </View>
              <Text style={styles.desc} numberOfLines={3}>
                {t.description}
              </Text>
              <Text style={styles.meta}>{new Date(t.createdAt).toLocaleString()}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.xs },
  sub: { color: colors.muted, marginBottom: spacing.lg, lineHeight: 20 },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ticketSubject: { flex: 1, fontWeight: '700', color: colors.navy },
  status: { color: colors.blue, fontWeight: '700', fontSize: 12 },
  desc: { color: colors.muted, marginTop: 6 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 8 },
})
