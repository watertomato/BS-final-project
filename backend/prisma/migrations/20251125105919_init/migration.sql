-- CreateTable
CREATE TABLE `t_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_user_username_key`(`username`),
    UNIQUE INDEX `t_user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_image` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_path` VARCHAR(500) NOT NULL,
    `thumbnail_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NULL,
    `resolution` VARCHAR(50) NULL,
    `shooting_time` DATETIME(3) NULL,
    `location` VARCHAR(255) NULL,
    `device_info` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_tag` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `type` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `t_tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `t_image_tag_relation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `image_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,

    UNIQUE INDEX `t_image_tag_relation_image_id_tag_id_key`(`image_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `t_image` ADD CONSTRAINT `t_image_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `t_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_image_tag_relation` ADD CONSTRAINT `t_image_tag_relation_image_id_fkey` FOREIGN KEY (`image_id`) REFERENCES `t_image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `t_image_tag_relation` ADD CONSTRAINT `t_image_tag_relation_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `t_tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
