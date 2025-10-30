<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('creator_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('recipient_id')
                ->nullable()
                ->constrained('users')
                ->cascadeOnDelete();
                
            $table->string('email');

            $table->string('name')->nullable();

            $table->boolean('is_mutual')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
