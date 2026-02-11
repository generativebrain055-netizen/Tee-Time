# Design System Quick Reference

## 🎨 Using the New Design System

### Import Components

```typescript
// Primitives
import { 
  AppButton, 
  AppInput, 
  AppCard, 
  AppAvatar, 
  AppBadge,
  AppChip,
  AppText 
} from '../ui/primitives';

// Layout
import { ScreenShell, ContentArea } from '../ui/layout';

// Navigation
import { AppHeader, AppBottomNav } from '../ui/navigation';

// Feedback
import { 
  LoadingOverlay, 
  EmptyState, 
  ErrorState,
  AppModal,
  ConfirmModal 
} from '../ui/feedback';

// Theme
import { useAppTheme } from '../ui/theme';
```

### Using Theme

```typescript
function MyComponent() {
  const { colors, spacing, typography, isDark } = useAppTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <AppText variant="h1" color={colors.text}>
        Hello World
      </AppText>
    </View>
  );
}
```

### Button Variants

```typescript
// Primary button
<AppButton variant="primary" onPress={handlePress}>
  Primary Action
</AppButton>

// Secondary button
<AppButton variant="secondary" onPress={handlePress}>
  Secondary Action
</AppButton>

// Outline button
<AppButton variant="outline" onPress={handlePress}>
  Outline Action
</AppButton>

// Ghost button
<AppButton variant="ghost" onPress={handlePress}>
  Ghost Action
</AppButton>

// With loading state
<AppButton variant="primary" loading={isLoading}>
  Submit
</AppButton>

// Disabled
<AppButton variant="primary" disabled>
  Disabled
</AppButton>
```

### Text Variants

```typescript
<AppText variant="h1">Heading 1</AppText>
<AppText variant="h2">Heading 2</AppText>
<AppText variant="h3">Heading 3</AppText>
<AppText variant="body">Body text</AppText>
<AppText variant="caption">Caption text</AppText>
<AppText variant="label">Label text</AppText>
```

### Cards

```typescript
<AppCard>
  <AppText variant="h3">Card Title</AppText>
  <AppText variant="body">Card content goes here</AppText>
</AppCard>

// With press action
<AppCard onPress={handlePress}>
  <AppText>Pressable Card</AppText>
</AppCard>
```

### Input Fields

```typescript
<AppInput
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  error={emailError}
/>

// With icon
<AppInput
  label="Password"
  placeholder="Enter password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  leftIcon="lock"
/>
```

### Screen Layout

```typescript
function MyScreen({ navigation }) {
  return (
    <ScreenShell>
      <AppHeader 
        title="Screen Title"
        onBack={() => navigation.goBack()}
      />
      <ContentArea>
        {/* Your content here */}
      </ContentArea>
    </ScreenShell>
  );
}
```

### Loading States

```typescript
// Full screen loading
<LoadingOverlay visible={isLoading} />

// Skeleton loader
import { Skeleton } from '../ui/feedback';

<Skeleton width={200} height={20} />
<Skeleton width="100%" height={100} style={{ marginTop: 10 }} />
```

### Empty States

```typescript
<EmptyState
  icon="inbox"
  title="No messages"
  description="You don't have any messages yet"
  action={{
    label: "Send a message",
    onPress: handleSendMessage
  }}
/>
```

### Error States

```typescript
<ErrorState
  title="Something went wrong"
  description="We couldn't load your data"
  action={{
    label: "Try again",
    onPress: handleRetry
  }}
/>
```

### Modals

```typescript
const [visible, setVisible] = useState(false);

<AppModal
  visible={visible}
  onDismiss={() => setVisible(false)}
  title="Modal Title"
>
  <AppText>Modal content</AppText>
  <AppButton onPress={() => setVisible(false)}>
    Close
  </AppButton>
</AppModal>

// Confirmation modal
<ConfirmModal
  visible={confirmVisible}
  title="Delete Item?"
  message="Are you sure you want to delete this item?"
  onConfirm={handleDelete}
  onCancel={() => setConfirmVisible(false)}
/>
```

### Avatars

```typescript
// With image
<AppAvatar
  source={{ uri: user.avatarUrl }}
  size={48}
/>

// With initials
<AppAvatar
  label={user.name}
  size={48}
/>

// With badge
<AppAvatar
  source={{ uri: user.avatarUrl }}
  size={48}
  badge={3}
/>
```

### Badges

```typescript
<AppBadge variant="success">Active</AppBadge>
<AppBadge variant="error">Error</AppBadge>
<AppBadge variant="warning">Warning</AppBadge>
<AppBadge variant="info">Info</AppBadge>
```

### Chips

```typescript
<AppChip selected={isSelected} onPress={handlePress}>
  Filter Option
</AppChip>

// With icon
<AppChip icon="check" selected>
  Selected
</AppChip>
```

### Animations

```typescript
import { AnimatedListItem } from '../ui/motion';

<AnimatedListItem index={0}>
  <AppCard>
    <AppText>Animated Item</AppText>
  </AppCard>
</AnimatedListItem>
```

### Toast Notifications

```typescript
import { useToast } from '../ui/feedback';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSuccess = () => {
    showToast({
      type: 'success',
      message: 'Action completed successfully'
    });
  };
  
  const handleError = () => {
    showToast({
      type: 'error',
      message: 'Something went wrong'
    });
  };
}
```

## 🎨 Color Tokens

Access colors through the theme:

```typescript
const { colors } = useAppTheme();

// Primary colors
colors.primary
colors.primaryLight
colors.primaryDark

// Semantic colors
colors.success
colors.error
colors.warning
colors.info

// Neutral colors
colors.background
colors.surface
colors.text
colors.textSecondary
colors.border
colors.divider

// Golf-specific
colors.green
colors.fairway
colors.rough
```

## 📏 Spacing

```typescript
const { spacing } = useAppTheme();

spacing.xs   // 4
spacing.sm   // 8
spacing.md   // 16
spacing.lg   // 24
spacing.xl   // 32
spacing.xxl  // 48
```

## 🔤 Typography

```typescript
const { typography } = useAppTheme();

typography.h1
typography.h2
typography.h3
typography.body
typography.caption
typography.label
```

## 🎭 Tailwind Classes

You can also use Tailwind classes with NativeWind:

```typescript
import { View, Text } from 'react-native';

<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Hello World
  </Text>
</View>
```

## 📱 Responsive Design

Use the metrics from theme:

```typescript
const { metrics } = useAppTheme();

metrics.screenWidth
metrics.screenHeight
metrics.isSmallDevice
metrics.isTablet
```

## 🔧 Utility Functions

```typescript
import { cn } from '../utils/cn';

// Combine class names
const className = cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class'
);
```

## 📚 Best Practices

1. **Always use theme colors** instead of hardcoded values
2. **Use spacing tokens** for consistent margins and padding
3. **Leverage typography variants** for consistent text styling
4. **Wrap screens in ScreenShell** for consistent layout
5. **Use AppHeader** for consistent navigation headers
6. **Show loading states** with LoadingOverlay or Skeleton
7. **Handle empty states** with EmptyState component
8. **Handle errors** with ErrorState component
9. **Use toast notifications** for user feedback
10. **Animate list items** for better UX

## 🎯 Common Patterns

### List Screen

```typescript
function ListScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  if (loading) {
    return <LoadingOverlay visible />;
  }
  
  if (data.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title="No items"
        description="No items found"
      />
    );
  }
  
  return (
    <ScreenShell>
      <AppHeader title="List" />
      <ContentArea>
        <FlatList
          data={data}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <AppCard>
                <AppText>{item.name}</AppText>
              </AppCard>
            </AnimatedListItem>
          )}
        />
      </ContentArea>
    </ScreenShell>
  );
}
```

### Form Screen

```typescript
function FormScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitForm({ name, email });
      showToast({ type: 'success', message: 'Form submitted' });
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to submit' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScreenShell>
      <AppHeader title="Form" />
      <ContentArea>
        <AppInput
          label="Name"
          value={name}
          onChangeText={setName}
        />
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <AppButton
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
        >
          Submit
        </AppButton>
      </ContentArea>
    </ScreenShell>
  );
}
```
