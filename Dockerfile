# Stage 1: Build Webpack assets
FROM node:20-alpine AS webpack-builder
WORKDIR /srv/jekyll
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run ci-build

# Stage 2: Final Jekyll image
FROM jekyll/jekyll:4.2.2
WORKDIR /srv/jekyll

# Install Node.js (Node 16+ on Alpine 3.15)
RUN apk add --no-cache nodejs npm

# Copy dependencies
COPY Gemfile package*.json ./

# Install Ruby dependencies as root
RUN bundle install

# Set permissions for the jekyll user
RUN chown -R jekyll:jekyll /srv/jekyll

# Switch to jekyll user
USER jekyll

# Install Node dependencies
RUN npm install --unsafe-perm

# Copy everything
COPY --chown=jekyll:jekyll . .

# Copy built assets
COPY --chown=jekyll:jekyll --from=webpack-builder /srv/jekyll/assets/js/main-bundle.js ./assets/js/

EXPOSE 4000 35729

# Use the Jekyll server directly for stability
CMD ["npm", "run", "start"]
