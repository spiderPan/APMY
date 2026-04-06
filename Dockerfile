# Stage 1: Build Webpack assets
FROM node:20-alpine AS webpack-builder

WORKDIR /srv/jekyll
COPY package*.json ./
RUN npm ci || npm install --force
COPY . .
RUN npm run ci-build

# Stage 2: Final Jekyll image
FROM jekyll/jekyll:4.0.1

WORKDIR /srv/jekyll

# Copy Gemfile and install gems
COPY Gemfile ./
RUN bundle install --clean --force

# Copy everything from the current directory
COPY . .

# Copy built assets from the webpack-builder stage
COPY --from=webpack-builder /srv/jekyll/assets/js/main-bundle.js ./assets/js/

# Install Node.js just for 'concurrently' if needed, 
# or we can simplify the start command for production/stable dev.
RUN apk add --no-cache nodejs npm

# Re-install npm packages in the final image to ensure binaries work
RUN npm install

EXPOSE 4000 35729

CMD ["npm", "run", "start"]
