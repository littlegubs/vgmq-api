FROM php:7.4-fpm

RUN docker-php-ext-install pdo_mysql

RUN pecl install apcu

RUN apt-get update && apt-get install -y \
    git \
    unzip

RUN docker-php-ext-enable apcu

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer --version

WORKDIR /usr/src/app

COPY ./ /usr/src/app

RUN PATH=$PATH:/usr/src/apps/vendor/bin:bin

