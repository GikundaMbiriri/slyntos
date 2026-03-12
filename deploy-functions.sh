#!/bin/bash

echo "🚀 Deploying Slyntos AI Firebase Functions..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Navigate to functions directory
cd functions

echo "📦 Installing Firebase Functions dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "🔧 Testing functions locally (optional)..."
read -p "Test functions locally first? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    firebase emulators:start --only functions &
    sleep 3
    echo "🧪 Functions running locally at: http://localhost:5001"
    echo "📋 Test callback URL: http://localhost:5001/YOUR-PROJECT-ID/us-central1/tumaCallback"
    echo "Press Ctrl+C to stop emulators and continue with deployment..."
    wait
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
cd ..
firebase deploy --only functions

echo "✅ Firebase Functions deployed successfully!"
echo ""
echo "🔗 Your callback URL is:"
echo "https://us-central1-$(firebase use --current).cloudfunctions.net/tumaCallback"
echo ""
echo "📝 Next steps:"
echo "1. Update the callback URL in src/services/unifiedPaymentService.ts"  
echo "2. Test M-Pesa payments with real transactions"
echo "3. Monitor function logs: firebase functions:log"