var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[23] = list;
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (143:3) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No fonts found in \"Fonts\" directory";
    			add_location(p, file, 143, 4, 3475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(143:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (125:3) {#if Object.keys(fonts).length > 0}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let each_value = Object.keys(/*fonts*/ ctx[1]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*clearFont, Object, fonts, removeFont, config, isSubsetTextValid, isFontNameValid, useFont*/ 451) {
    				each_value = Object.keys(/*fonts*/ ctx[1]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(125:3) {#if Object.keys(fonts).length > 0}",
    		ctx
    	});

    	return block;
    }

    // (137:7) {:else}
    function create_else_block(ctx) {
    	let p;
    	let input;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[16](/*fontFile*/ ctx[22]);
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			input = element("input");
    			attr_dev(input, "type", "button");
    			input.value = "➕ Use font";
    			add_location(input, file, 137, 11, 3316);
    			add_location(p, file, 137, 8, 3313);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(137:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (130:7) {#if fontFile in config}
    function create_if_block_4(ctx) {
    	let p0;
    	let t1;
    	let p1;
    	let input0;
    	let t2;
    	let p2;
    	let t4;
    	let p3;
    	let textarea;
    	let t5;
    	let p4;
    	let input1;
    	let t6;
    	let p5;
    	let input2;
    	let mounted;
    	let dispose;

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[12].call(input0, /*fontFile*/ ctx[22]);
    	}

    	function textarea_input_handler() {
    		/*textarea_input_handler*/ ctx[13].call(textarea, /*fontFile*/ ctx[22]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[14](/*fontFile*/ ctx[22]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[15](/*fontFile*/ ctx[22]);
    	}

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "CSS font-family:";
    			t1 = space();
    			p1 = element("p");
    			input0 = element("input");
    			t2 = space();
    			p2 = element("p");
    			p2.textContent = "Subsetting text:";
    			t4 = space();
    			p3 = element("p");
    			textarea = element("textarea");
    			t5 = space();
    			p4 = element("p");
    			input1 = element("input");
    			t6 = space();
    			p5 = element("p");
    			input2 = element("input");
    			add_location(p0, file, 130, 8, 2745);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			attr_dev(input0, "class", "svelte-1i9pqhz");
    			toggle_class(input0, "invalid", !isFontNameValid(/*config*/ ctx[0][/*fontFile*/ ctx[22]].fontname));
    			add_location(input0, file, 131, 11, 2781);
    			add_location(p1, file, 131, 8, 2778);
    			add_location(p2, file, 132, 8, 2923);
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "class", "svelte-1i9pqhz");
    			toggle_class(textarea, "invalid", !isSubsetTextValid(/*config*/ ctx[0][/*fontFile*/ ctx[22]].text));
    			add_location(textarea, file, 133, 11, 2959);
    			add_location(p3, file, 133, 8, 2956);
    			attr_dev(input1, "type", "button");
    			input1.value = "❌ Remove";
    			add_location(input1, file, 134, 11, 3109);
    			add_location(p4, file, 134, 8, 3106);
    			attr_dev(input2, "type", "button");
    			input2.value = "🧹 Clear";
    			add_location(input2, file, 135, 11, 3205);
    			add_location(p5, file, 135, 8, 3202);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, input0);
    			set_input_value(input0, /*config*/ ctx[0][/*fontFile*/ ctx[22]].fontname);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, textarea);
    			set_input_value(textarea, /*config*/ ctx[0][/*fontFile*/ ctx[22]].text);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, input1);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, input2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(textarea, "input", textarea_input_handler),
    					listen_dev(input1, "click", click_handler, false, false, false),
    					listen_dev(input2, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*config, Object, fonts*/ 3 && input0.value !== /*config*/ ctx[0][/*fontFile*/ ctx[22]].fontname) {
    				set_input_value(input0, /*config*/ ctx[0][/*fontFile*/ ctx[22]].fontname);
    			}

    			if (dirty & /*isFontNameValid, config, Object, fonts*/ 3) {
    				toggle_class(input0, "invalid", !isFontNameValid(/*config*/ ctx[0][/*fontFile*/ ctx[22]].fontname));
    			}

    			if (dirty & /*config, Object, fonts*/ 3) {
    				set_input_value(textarea, /*config*/ ctx[0][/*fontFile*/ ctx[22]].text);
    			}

    			if (dirty & /*isSubsetTextValid, config, Object, fonts*/ 3) {
    				toggle_class(textarea, "invalid", !isSubsetTextValid(/*config*/ ctx[0][/*fontFile*/ ctx[22]].text));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(p5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(130:7) {#if fontFile in config}",
    		ctx
    	});

    	return block;
    }

    // (126:4) {#each Object.keys(fonts) as fontFile}
    function create_each_block(ctx) {
    	let div;
    	let fieldset;
    	let legend;
    	let b;
    	let span;
    	let t1;
    	let t2_value = /*fontFile*/ ctx[22] + "";
    	let t2;
    	let t3;
    	let t4;

    	function select_block_type_1(ctx, dirty) {
    		if (/*fontFile*/ ctx[22] in /*config*/ ctx[0]) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			b = element("b");
    			span = element("span");
    			span.textContent = "🗛";
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			if_block.c();
    			t4 = space();
    			attr_dev(span, "class", "font-icon svelte-1i9pqhz");
    			add_location(span, file, 128, 18, 2645);
    			add_location(b, file, 128, 15, 2642);
    			add_location(legend, file, 128, 7, 2634);
    			add_location(fieldset, file, 127, 6, 2615);
    			attr_dev(div, "class", "font svelte-1i9pqhz");
    			add_location(div, file, 126, 5, 2589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(legend, b);
    			append_dev(b, span);
    			append_dev(b, t1);
    			append_dev(b, t2);
    			append_dev(fieldset, t3);
    			if_block.m(fieldset, null);
    			append_dev(div, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fonts*/ 2 && t2_value !== (t2_value = /*fontFile*/ ctx[22] + "")) set_data_dev(t2, t2_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(fieldset, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(126:4) {#each Object.keys(fonts) as fontFile}",
    		ctx
    	});

    	return block;
    }

    // (153:2) {#if output.length > 0}
    function create_if_block_2(ctx) {
    	let div;
    	let p;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			textarea = element("textarea");
    			attr_dev(textarea, "class", "output svelte-1i9pqhz");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "cols", "45");
    			add_location(textarea, file, 154, 7, 3814);
    			add_location(p, file, 154, 4, 3811);
    			attr_dev(div, "id", "output");
    			add_location(div, file, 153, 3, 3788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, textarea);
    			set_input_value(textarea, /*output*/ ctx[2]);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*output*/ 4) {
    				set_input_value(textarea, /*output*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(153:2) {#if output.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (159:1) {#if error}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let div1_transition;
    	let current;
    	let if_block = /*error*/ ctx[3] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "id", "overlay-bg");
    			attr_dev(div0, "class", "svelte-1i9pqhz");
    			add_location(div0, file, 160, 3, 4001);
    			attr_dev(div1, "id", "overlay");
    			attr_dev(div1, "class", "svelte-1i9pqhz");
    			add_location(div1, file, 159, 2, 3940);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*error*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*error*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching && div1_transition) div1_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(159:1) {#if error}",
    		ctx
    	});

    	return block;
    }

    // (162:3) {#if error}
    function create_if_block_1(ctx) {
    	let div0;
    	let t0;
    	let br0;
    	let br1;
    	let t1;
    	let t2;
    	let div0_transition;
    	let t3;
    	let div1;
    	let img;
    	let img_src_value;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("😞 Error!");
    			br0 = element("br");
    			br1 = element("br");
    			t1 = space();
    			t2 = text(/*errorMessage*/ ctx[4]);
    			t3 = space();
    			div1 = element("div");
    			img = element("img");
    			add_location(br0, file, 163, 14, 4118);
    			add_location(br1, file, 163, 18, 4122);
    			attr_dev(div0, "id", "error");
    			attr_dev(div0, "class", "svelte-1i9pqhz");
    			add_location(div0, file, 162, 4, 4050);
    			attr_dev(img, "id", "close-bg");
    			if (!src_url_equal(img.src, img_src_value = "images/close.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "close");
    			attr_dev(img, "class", "svelte-1i9pqhz");
    			add_location(img, file, 167, 5, 4252);
    			attr_dev(div1, "id", "close");
    			attr_dev(div1, "class", "svelte-1i9pqhz");
    			add_location(div1, file, 166, 4, 4167);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, br1);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*closeOverlay*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*errorMessage*/ 16) set_data_dev(t2, /*errorMessage*/ ctx[4]);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 100 }, true);
    				div0_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 100 }, false);
    			div0_transition.run(0);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching && div0_transition) div0_transition.end();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(162:3) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div2;
    	let h1;
    	let t1;
    	let div0;
    	let show_if;
    	let t2;
    	let div1;
    	let p;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let t5;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*fonts*/ 2) show_if = null;
    		if (show_if == null) show_if = !!(Object.keys(/*fonts*/ ctx[1]).length > 0);
    		if (show_if) return create_if_block_3;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*output*/ ctx[2].length > 0 && create_if_block_2(ctx);
    	let if_block2 = /*error*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Web Font Generator";
    			t1 = space();
    			div0 = element("div");
    			if_block0.c();
    			t2 = space();
    			div1 = element("div");
    			p = element("p");
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			add_location(h1, file, 122, 2, 2451);
    			attr_dev(div0, "id", "fonts");
    			attr_dev(div0, "class", "svelte-1i9pqhz");
    			add_location(div0, file, 123, 2, 2482);
    			input0.disabled = /*disabled*/ ctx[5];
    			attr_dev(input0, "type", "button");
    			input0.value = "⚙️ Generate fonts.css";
    			add_location(input0, file, 148, 4, 3573);
    			input1.disabled = /*disabled*/ ctx[5];
    			attr_dev(input1, "type", "button");
    			input1.value = "❌ Remove all";
    			add_location(input1, file, 149, 4, 3664);
    			add_location(p, file, 147, 3, 3564);
    			attr_dev(div1, "id", "buttons");
    			attr_dev(div1, "class", "svelte-1i9pqhz");
    			add_location(div1, file, 146, 2, 3541);
    			attr_dev(div2, "id", "ui");
    			attr_dev(div2, "class", "svelte-1i9pqhz");
    			add_location(div2, file, 121, 1, 2434);
    			attr_dev(main, "class", "svelte-1i9pqhz");
    			add_location(main, file, 120, 0, 2425);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, input0);
    			append_dev(p, t3);
    			append_dev(p, input1);
    			append_dev(div2, t4);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(main, t5);
    			if (if_block2) if_block2.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*generate*/ ctx[9], false, false, false),
    					listen_dev(input1, "click", /*clear*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (!current || dirty & /*disabled*/ 32) {
    				prop_dev(input0, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (!current || dirty & /*disabled*/ 32) {
    				prop_dev(input1, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (/*output*/ ctx[2].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*error*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*error*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function isFontNameValid(fontName) {
    	return fontName.length > 0 && fontName.length < 32;
    }

    function isSubsetTextValid(text) {
    	return text.length > 0;
    }

    function instance($$self, $$props, $$invalidate) {
    	let disabled;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let sse;
    	let fonts = {};
    	let config = {};
    	let output = "";
    	let error = false;
    	let errorMessage = "";

    	async function updateFonts() {
    		const res = await apiRequest({ method: "fontsList" });
    		$$invalidate(1, fonts = res.data.fonts);
    		console.log(fonts);
    	}

    	async function updateConfig() {
    		const res = await apiRequest({ method: "fontsConfig" });
    		$$invalidate(0, config = res.data.config);
    		console.log(config);
    	}

    	async function useFont(fontFile) {
    		$$invalidate(
    			0,
    			config[fontFile] = {
    				text: "",
    				engine: "fec",
    				fontname: fonts[fontFile].name || ""
    			},
    			config
    		);

    		$$invalidate(0, config);
    	}

    	async function removeFont(fontFile) {
    		if (fontFile in config) delete config[fontFile];
    		$$invalidate(0, config);
    	}

    	async function clearFont(fontFile) {
    		if (fontFile in config) {
    			$$invalidate(0, config[fontFile].text = "", config);
    		}
    	}

    	async function isConfigValid() {
    		for (const fontFile of Object.keys(config)) {
    			if (!isFontNameValid(config[fontFile].fontname)) return false;
    			if (!isSubsetTextValid(config[fontFile].text)) return false;
    		}

    		return true;
    	}

    	async function generate() {
    		if (await isConfigValid()) {
    			const res = await apiRequest({ method: "generateFonts", config });

    			if (res.ok) {
    				if (res.output) $$invalidate(2, output = res.output);
    			} else {
    				$$invalidate(3, error = true);
    				$$invalidate(4, errorMessage = res.message);
    			}
    		}
    	}

    	async function clear() {
    		$$invalidate(0, config = {});
    		$$invalidate(2, output = "");
    	}

    	async function closeOverlay() {
    		$$invalidate(3, error = false);
    		$$invalidate(4, errorMessage = "");
    	}

    	onMount(async () => {
    		await updateFonts();
    		await updateConfig();
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			const data = JSON.parse(event.data);

    			if (data.subsystem === "fonts") {
    				await updateFonts();
    			}
    		};

    		sse.onerror = function (error) {
    			console.error("EventSource failed: ", error);
    		};
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler(fontFile) {
    		config[fontFile].fontname = this.value;
    		$$invalidate(0, config);
    	}

    	function textarea_input_handler(fontFile) {
    		config[fontFile].text = this.value;
    		$$invalidate(0, config);
    	}

    	const click_handler = fontFile => removeFont(fontFile);
    	const click_handler_1 = fontFile => clearFont(fontFile);
    	const click_handler_2 = fontFile => useFont(fontFile);

    	function textarea_input_handler_1() {
    		output = this.value;
    		$$invalidate(2, output);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		sse,
    		fonts,
    		config,
    		output,
    		error,
    		errorMessage,
    		apiRequest,
    		updateFonts,
    		updateConfig,
    		useFont,
    		removeFont,
    		clearFont,
    		isFontNameValid,
    		isSubsetTextValid,
    		isConfigValid,
    		generate,
    		clear,
    		closeOverlay,
    		disabled
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('fonts' in $$props) $$invalidate(1, fonts = $$props.fonts);
    		if ('config' in $$props) $$invalidate(0, config = $$props.config);
    		if ('output' in $$props) $$invalidate(2, output = $$props.output);
    		if ('error' in $$props) $$invalidate(3, error = $$props.error);
    		if ('errorMessage' in $$props) $$invalidate(4, errorMessage = $$props.errorMessage);
    		if ('disabled' in $$props) $$invalidate(5, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*config*/ 1) {
    			$$invalidate(5, disabled = Object.keys(config).length === 0);
    		}
    	};

    	return [
    		config,
    		fonts,
    		output,
    		error,
    		errorMessage,
    		disabled,
    		useFont,
    		removeFont,
    		clearFont,
    		generate,
    		clear,
    		closeOverlay,
    		input0_input_handler,
    		textarea_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		textarea_input_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
