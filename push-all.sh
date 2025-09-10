#!/bin/bash

# Push to all configured remotes
echo "🚀 Pushing to all remotes..."

# Push to origin (Chief03)
echo "📤 Pushing to Chief03/pathfind..."
git push origin main

# Push to chinchilla (ChinchillaEnterprises)
echo "📤 Pushing to ChinchillaEnterprises/pathfind..."
git push chinchilla main

echo "✅ Successfully pushed to all remotes!"