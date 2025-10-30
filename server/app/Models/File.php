<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    protected $fillable = ['user_id', 'text', 'file_path', 'file_type', 'file_size', 'hash' ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
