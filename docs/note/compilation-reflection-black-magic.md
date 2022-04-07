---
title: Black Magic of Compilation Reflection
author: ChAoS UnItY
date: '2022-4-7'
---

V Lang has lots of incredible features, including today's topic: compilation reflection.

## What is compilation reflection?

Compilation reflection allows code to be expanded into proper equivalent code by compiler, which means
its information is able to be known by compiler without additional information provided, with just pure 
AST context.

For example, a basic compilation reflection's example would looks like this:


```v
fn main() {
    reflect<string>()
}

fn reflect<T>() {
    $if T is string {
        println('T is string!')
    }
}
```

This would print out `T is string!`.

To talk about the implementation of V's compilation reflection, we have to start from how V implement generic.

## V's generic

> We'll discuss V's generic based on C backend

Generic does not exists in C, in other words, V cannot directly being benefited from using C in this case. In
V, V uses a technique call *Stenciling*: By generating different code based on type parameters, we can have make
generic possible in C. For example, consider the following code:

```v
fn generic<T>(t T) {
    // ...
}
```

If we call `generic("")` in any other places, compiler would stencil it and generate pseudo code like below:

```c
void generic__string(string t) {
    // ...
}
```

In this technique, we can see compiler already knows type parameter's information, thus, compilation reflection the
black magic has been introduced.

## How magical it is?

### Recursive analysis

Compilation reflection is not limited to single but multiple layers of functions, let's take [vaker](https://github.com/ChAoSUnItY/vaker)'s code as example:

```v
pub fn fake_data_wdf<T>(t &T, df &DataFaker) {
	$if T is $Array {
		unsafe {
			for i in 0 .. t.len {
				fake_data_wdf(&t[i], df)
			}
		}
	} $else $if T is $Map {
		fake_map(t, df)
	} $else $if T is time.Time {
		unix_time(ptr: t, sz: sizeof(T))
	} $else $if T is $Struct {
		$for f in T.fields {
			$if f.typ is string {
			}
			// Dummy expression to generate and specify t.$(f.name)'s type

			mut attrs, errors := get_attrs(t.$(f.name), f, df)

			if errors.len > 0 {
				for e in errors {
					eprintln(e.str())
				}
				return
			}

			if !attrs.skip() {
				cm_df := mod(&(t.$(f.name)), attrs, df)

				fake_data_wdf(&(t.$(f.name)), cm_df)
			}
		}
	} $else {
		if !isnil(df.current_attribute_function) {
			func := *df.current_attribute_function
			func(ptr: t, sz: sizeof(*t), type_idx: T.idx)
			return
		}

		unsafe {
			*t = fake_primitive_value<T>(df) or { panic(err) }
		}
	}
}
```

```v
[inline]
fn fake_map<K, V>(m &map[K]V, df &DataFaker) {
	$if K is string {
	}
	// Dummy expression to generate and specify K type
	$if V is string {
	}
	// Dummy expression to generate and specify V type

	fake_entry_count := rand.int_in_range(df.min_map_len, df.max_map_len) or { panic(err) }

	for _ in 0 .. fake_entry_count {
		key := fake_primitive_value<K>(df) or { panic(err) }
		value := fake_primitive_value<V>(df) or { panic(err) }

		unsafe {
			(*m)[key] = value
		}
	}
}
```

We can see `fake_data_wdf` calls `fake_map` when type parameter `T` is a map type, but V is even able to infer
function `fake_map`'s type parameter `K` and `V`.

Further more, take a looks at `$else $if T is $Struct` branch: There are even more hacks you can do with compilation reflection. Compilation reflection can also provide fields' information: By calling T.fields as an iterator in compile-time for loop syntax:

```v
$for field in T.fields {
    // ...
}
```

You can get every fields:
- Name
- Type (But in type index form)
- Attributes

and some other modifiers, see [FieldData](https://modules.vlang.io/#FieldData) for more information.

### Synthetic field reference

Continues from previous section, we know that compilation reflection enables you to access fields' information,
but there's even more hacks could be done by this. What if we need to assign a value to the field? Seems impossible
, right? Well, compilation reflection can do that too! To reference a value, you can write like below:

```v
// ...
t.$(field.name) = // ...
// ...
```

Compiler will replace the reference, or compile-time selector syntax, with the field's actual name, isn't that amazing? From `vaker`'s code, it's nod doubt that compiler is able to even infer `$(field.name)` type and pass it to other generic function!

## Bonus: How to use generic to type matching

You might notice that `is` expression cannot do dynamic type checking. Luckily we can borrow the power of V's 
compiler, there is one prerequisite to be able to use the *hack*:

**Current function context must have type parameter exists.**

To do this hack, I'll show you an example code:

```v
fn generic<T>(_ T) int {
    return T.typ
}
```

You can see that we reference a field `typ` from the type parameter `T`, and it returns an integer value, so
what's `typ`? Well, `typ` is a compiler's internal struct field, and it refers to the the type index in current compilation global table, a struct stores almost every instance's information. By storing this integer value, now
the value can be used as an alternative information for the type parameter `T`. But this hack does requires the other 
value's type parameter exists so it can also reference `typ` field and do an equality checking.

## Conclusion

V Lang's compiler is probably the most hacky compiler implementation I've ever seen, though it's still unstable compared to being a *Releasable* product, we can see its potential possibility through **Compilation reflection** technique!