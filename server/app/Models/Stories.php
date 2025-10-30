<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stories extends Model
{
    protected $table = 'stories';

    protected $fillable = ['user_id', 'text', 'file_id', 'expires_at'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function file()
    {
        return $this->belongsTo(File::class, 'file_id');
    }
}
