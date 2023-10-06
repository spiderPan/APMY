FROM jekyll/jekyll:4.0.1

WORKDIR /srv/jekyll

# Copy the Gemfile
COPY Gemfile ./

# Install gems
RUN bundle install --clean --force

# Copy the rest of the application code
COPY . .

# Install NPM packages
COPY --from=node:16-slim /usr/local/bin /usr/local/bin
COPY --from=node:16-slim /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN npm install

# Expose port 4000
EXPOSE 4000

# Run the command
CMD ["bundle", "exec", "jekyll", "serve"]