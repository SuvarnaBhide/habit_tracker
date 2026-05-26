package com.utility_apps.habit_tracker.controller;

import com.utility_apps.habit_tracker.entity.Habit;
import com.utility_apps.habit_tracker.repository.HabitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
public class HomeController {

    private final HabitRepository habitRepository;

    @GetMapping("/")
    public String home(Model model) {

        model.addAttribute("habits",
                habitRepository.findAll());

        return "index";
    }

    @PostMapping("/habits")
    public String addHabit(@RequestParam String name) {

        Habit habit = new Habit();
        habit.setName(name);

        habitRepository.save(habit);

        return "redirect:/";
    }
}
