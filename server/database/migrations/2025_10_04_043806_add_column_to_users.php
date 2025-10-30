<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add column first
            $table->unsignedBigInteger('file_id')->nullable();

            // Then foreign key constraint
            $table->foreign('file_id')
                ->references('id')
                ->on('files')
                ->onDelete('set null'); // optional: nullify if file deleted
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['file_id']);
            $table->dropColumn('file_id');
        });
    }
};
